import { Router } from 'express';
import AiAdventure from '../models/AiAdventure.js';
import { authMiddleware } from '../middleware/auth.js';
import { callGemini } from '../services/gemini.js';

const router = Router();

// All routes require auth
router.use(authMiddleware);

// GET /api/ai-adventures — list adventures for current user
router.get('/', async (req, res) => {
  try {
    const adventures = await AiAdventure.find({
      coupleId: req.user.coupleId,
      $or: [{ user1: req.user.id }, { user2: req.user.id }]
    })
      .populate('user1', 'username displayName')
      .populate('user2', 'username displayName')
      .sort({ updatedAt: -1 });
    res.json({ adventures });
  } catch (err) {
    console.error('List adventures error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/ai-adventures — create new adventure
router.post('/', async (req, res) => {
  try {
    const { title, persona, environment, user2Id, user1Profile, user2Profile, maxRounds } = req.body;

    if (!persona || !persona.trim()) return res.status(400).json({ error: 'Persona is required' });
    if (!environment || !environment.trim()) return res.status(400).json({ error: 'Environment is required' });
    if (!user2Id) return res.status(400).json({ error: 'Second player is required' });
    if (user2Id === req.user.id) return res.status(400).json({ error: 'Cannot play with yourself' });

    const adventure = await AiAdventure.create({
      title: title || '',
      persona: persona.trim(),
      environment: environment.trim(),
      user1: req.user.id,
      user2: user2Id,
      user1Profile: user1Profile || '',
      user2Profile: user2Profile || '',
      maxRounds: maxRounds || 30,
      coupleId: req.user.coupleId,
    });

    await adventure.populate('user1', 'username displayName');
    await adventure.populate('user2', 'username displayName');

    res.status(201).json({ adventure });
  } catch (err) {
    console.error('Create adventure error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/ai-adventures/:id — get full adventure
router.get('/:id', async (req, res) => {
  try {
    const adventure = await AiAdventure.findOne({ _id: req.params.id, coupleId: req.user.coupleId })
      .populate('user1', 'username displayName')
      .populate('user2', 'username displayName');
    if (!adventure) return res.status(404).json({ error: 'Adventure not found' });

    // Verify user is part of this adventure
    if (adventure.user1._id.toString() !== req.user.id && adventure.user2._id.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not part of this adventure' });
    }

    res.json({ adventure });
  } catch (err) {
    console.error('Get adventure error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/ai-adventures/:id/act — send a message
router.post('/:id/act', async (req, res) => {
  try {
    const adventure = await AiAdventure.findOne({ _id: req.params.id, coupleId: req.user.coupleId })
      .populate('user1', 'username displayName')
      .populate('user2', 'username displayName');
    if (!adventure) return res.status(404).json({ error: 'Adventure not found' });
    if (adventure.status !== 'active') return res.status(400).json({ error: 'Adventure is already concluded' });

    // Determine which player this user is
    let playerKey;
    if (adventure.user1._id.toString() === req.user.id) playerKey = 'user1';
    else if (adventure.user2._id.toString() === req.user.id) playerKey = 'user2';
    else return res.status(403).json({ error: 'Not part of this adventure' });

    // Enforce turn order
    if (adventure.currentTurn !== playerKey) {
      return res.status(400).json({ error: 'Not your turn' });
    }

    const { message } = req.body;
    if (!message || !message.trim()) return res.status(400).json({ error: 'Message is required' });

    // Append user's message to history
    adventure.history.push({ author: playerKey, content: message.trim() });

    // Build system prompt
    const user1Name = adventure.user1.displayName || adventure.user1.username;
    const user2Name = adventure.user2.displayName || adventure.user2.username;
    const systemPrompt = [
      `You are a creative AI playing the following role:`,
      `--- Persona ---`,
      adventure.persona,
      `--- Environment ---`,
      adventure.environment,
      `--- Player Profiles ---`,
      `User1 (${user1Name}): ${adventure.user1Profile || 'No profile set'}`,
      `User2 (${user2Name}): ${adventure.user2Profile || 'No profile set'}`,
      `--- Instructions ---`,
      `Respond in character as the persona. Address each player's messages individually.`,
      `Guide the narrative toward a natural conclusion within ${adventure.maxRounds} rounds.`,
      `Keep responses to 2-3 paragraphs. Be vivid and engaging.`,
      `Current round: ${adventure.currentRound + 1} / ${adventure.maxRounds}`,
    ].join('\n');

    // Build sliding window: last 20 messages
    const recentHistory = adventure.history.slice(-20);

    // Call Gemini
    const result = await callGemini({
      systemPrompt,
      history: recentHistory,
    });

    if (result.error) {
      return res.status(502).json({ error: result.error });
    }

    // Append AI response
    adventure.history.push({ author: 'ai', content: result.text });
    adventure.currentRound += 1;
    adventure.currentTurn = playerKey === 'user1' ? 'user2' : 'user1';
    adventure.markModified('history');
    await adventure.save();

    res.json({ response: result.text, adventure });
  } catch (err) {
    console.error('Act error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/ai-adventures/:id/end — conclude adventure
router.post('/:id/end', async (req, res) => {
  try {
    const adventure = await AiAdventure.findOne({ _id: req.params.id, coupleId: req.user.coupleId })
      .populate('user1', 'username displayName')
      .populate('user2', 'username displayName');
    if (!adventure) return res.status(404).json({ error: 'Adventure not found' });
    if (adventure.status !== 'active') return res.status(400).json({ error: 'Already concluded' });

    // Optional: generate epilogue
    const systemPrompt = [
      `The adventure "${adventure.title || 'Untitled'}" has concluded.`,
      `Write a brief epilogue (1-2 paragraphs) that wraps up the story.`,
      `Reference the key events that happened. End with a sense of closure.`,
    ].join('\n');

    const recentHistory = adventure.history.slice(-10);
    const result = await callGemini({ systemPrompt, history: recentHistory, maxOutputTokens: 600 });

    const epilogue = result.text || '*The adventure has ended.*';
    adventure.history.push({ author: 'ai', content: `[EPILOGUE] ${epilogue}` });
    adventure.status = 'concluded';
    adventure.markModified('history');
    await adventure.save();

    res.json({ epilogue, adventure });
  } catch (err) {
    console.error('End adventure error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/ai-adventures/:id — delete adventure
router.delete('/:id', async (req, res) => {
  try {
    const adventure = await AiAdventure.findOne({ _id: req.params.id, coupleId: req.user.coupleId });
    if (!adventure) return res.status(404).json({ error: 'Adventure not found' });
    await AiAdventure.deleteOne({ _id: req.params.id, coupleId: req.user.coupleId });
    res.json({ message: 'Adventure deleted' });
  } catch (err) {
    console.error('Delete adventure error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
