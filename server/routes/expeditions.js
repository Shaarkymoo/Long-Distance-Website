import { Router } from 'express';
import Expedition from '../models/Expedition.js';
import Score from '../models/Score.js';
import { authMiddleware } from '../middleware/auth.js';
import { callGemini } from '../services/gemini.js';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const expeditions = await Expedition.find({ coupleId: req.user.coupleId })
      .sort({ createdAt: -1 });
    res.json({ expeditions });
  } catch (err) {
    console.error('List expeditions error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/active', async (req, res) => {
  try {
    const expeditions = await Expedition.find({ coupleId: req.user.coupleId, status: { $in: ['active', 'pending'] } })
      .sort({ createdAt: -1 });
    res.json({ expeditions });
  } catch (err) {
    console.error('List active expeditions error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required' });

    const prompt = `Create a fun long-distance couple challenge based on the title '${title}'. The challenge should be something both partners can do independently and share photos via WhatsApp. Return JSON: { challenge: '2-3 sentence description' }`;

    const result = await callGemini({
      systemPrompt: prompt,
      history: [],
      maxOutputTokens: 600,
    });

    if (result.error) return res.status(502).json({ error: result.error });

    let challenge;
    try {
      const parsed = JSON.parse(result.text);
      challenge = parsed.challenge;
    } catch {
      challenge = result.text;
    }

    if (!challenge) return res.status(502).json({ error: 'Failed to generate challenge' });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const expedition = await Expedition.create({
      title: title.trim(),
      challenge,
      generatedBy: 'gemini',
      createdBy: req.user.id,
      coupleId: req.user.coupleId,
      expiresAt,
    });

    res.status(201).json({ expedition });
  } catch (err) {
    console.error('Create expedition error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/vote', async (req, res) => {
  try {
    const expedition = await Expedition.findOne({ _id: req.params.id, coupleId: req.user.coupleId });
    if (!expedition) return res.status(404).json({ error: 'Expedition not found' });

    const { vote } = req.body;
    if (!vote || !['go', 'no-go'].includes(vote)) {
      return res.status(400).json({ error: 'Vote must be "go" or "no-go"' });
    }

    const existingVote = expedition.votes.find(
      v => v.userId.toString() === req.user.id
    );

    if (existingVote) {
      existingVote.vote = vote;
      existingVote.votedAt = new Date();
    } else {
      expedition.votes.push({
        userId: req.user.id,
        vote,
        votedAt: new Date(),
      });
    }

    const goVotes = expedition.votes.filter(v => v.vote === 'go');
    if (goVotes.length >= 2) {
      expedition.status = 'active';
    }

    expedition.markModified('votes');
    await expedition.save();

    res.json({ expedition });
  } catch (err) {
    console.error('Vote expedition error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/ready', async (req, res) => {
  try {
    const expedition = await Expedition.findOne({ _id: req.params.id, coupleId: req.user.coupleId });
    if (!expedition) return res.status(404).json({ error: 'Expedition not found' });

    expedition.readyCount += 1;

    if (expedition.readyCount >= 2) {
      expedition.status = 'completed';
      expedition.completedAt = new Date();
      expedition.scoreAwarded = 20;

      await Score.findByIdAndUpdate(
        `${req.user.coupleId}_expedition_score`,
        { $inc: { total: 20 }, $setOnInsert: { coupleId: req.user.coupleId } },
        { upsert: true, setDefaultsOnInsert: true }
      );
    }

    await expedition.save();

    res.json({ expedition });
  } catch (err) {
    console.error('Ready expedition error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const expedition = await Expedition.findOne({ _id: req.params.id, coupleId: req.user.coupleId })
      .populate('createdBy', 'displayName')
      .populate('votes.userId', 'displayName');
    if (!expedition) return res.status(404).json({ error: 'Expedition not found' });
    res.json({ expedition });
  } catch (err) {
    console.error('Get expedition error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
