import { Router } from 'express';
import Message from '../models/Message.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const messages = await Message.find()
      .sort({ createdAt: -1 })
      .populate('author', 'username displayName');
    res.json({ messages });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Content is required' });
    }
    const message = await Message.create({
      content: content.trim(),
      author: req.user.id
    });
    const populated = await message.populate('author', 'username displayName');
    res.status(201).json({ message: populated });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
