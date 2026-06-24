import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import ConversationPrompt from '../models/ConversationPrompt.js';
import User from '../models/User.js';
import { authMiddleware } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();

// GET /api/conversations/current — get the current active topic + both thoughts + couple info
router.get('/current', authMiddleware, async (req, res) => {
  try {
    const [current, users] = await Promise.all([
      ConversationPrompt.findOne({ isCurrent: true }),
      User.find({}).select('username displayName'),
    ]);
    res.json({
      prompt: current || null,
      couple: users.map(u => ({ id: u._id, username: u.username, displayName: u.displayName })),
    });
  } catch (err) {
    console.error('Error fetching current prompt:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/conversations/random — fetch a new unused prompt and make it current
router.get('/random', authMiddleware, async (req, res) => {
  try {
    // Deactivate any existing current prompt
    await ConversationPrompt.updateMany({ isCurrent: true }, { isCurrent: false });

    // Find a new unused prompt
    const prompt = await ConversationPrompt.findOneAndUpdate(
      { used: false },
      { used: true, isCurrent: true, thoughts: {} },
      { new: true }
    );

    if (!prompt) {
      return res.json({ prompt: null, message: 'All prompts used!' });
    }

    const users = await User.find({}).select('username displayName');
    res.json({
      prompt,
      couple: users.map(u => ({ id: u._id, username: u.username, displayName: u.displayName })),
    });
  } catch (err) {
    console.error('Error fetching random prompt:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/conversations/thoughts — save the current user's thoughts on the current topic
router.post('/thoughts', authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Thoughts text is required' });
    }

    const current = await ConversationPrompt.findOne({ isCurrent: true });
    if (!current) {
      return res.status(404).json({ error: 'No active topic. Get a prompt first.' });
    }

    current.thoughts = current.thoughts || {};
    current.thoughts[req.user.id] = {
      text: text.trim(),
      displayName: req.user.displayName || req.user.username,
      updatedAt: new Date(),
    };
    await current.save();

    const users = await User.find({}).select('username displayName');
    res.json({
      prompt: current,
      couple: users.map(u => ({ id: u._id, username: u.username, displayName: u.displayName })),
    });
  } catch (err) {
    console.error('Error saving thoughts:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Seed: read questions from text files and populate collection
async function seedPrompts() {
  try {
    const count = await ConversationPrompt.countDocuments();
    if (count > 0) {
      console.log(`Conversation prompts: ${count} already exist, skipping seed`);
      return;
    }

    const projectRoot = path.join(__dirname, '..', '..');
    const file1 = path.join(projectRoot, 'other files', 'parade_fun_questions.txt');
    const file2 = path.join(projectRoot, 'other files', 'conversation_parade_questions.txt');

    const lines = [];

    for (const filePath of [file1, file2]) {
      if (!fs.existsSync(filePath)) {
        console.warn(`Warning: ${filePath} not found, skipping`);
        continue;
      }
      const content = fs.readFileSync(filePath, 'utf-8');
      const fileLines = content.split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0)
        .map(l => l.replace(/^\d+[\.\)]\s*/, '').trim())
        .filter(l => l.length > 0);
      lines.push(...fileLines);
    }

    // Deduplicate
    const unique = [...new Set(lines)];

    if (unique.length === 0) {
      console.warn('No prompts found to seed');
      return;
    }

    await ConversationPrompt.insertMany(
      unique.map(text => ({ promptText: text }))
    );

    console.log(`Seeded ${unique.length} conversation prompts from text files`);
  } catch (err) {
    console.error('Seed prompts error:', err.message);
  }
}
seedPrompts();

export default router;
