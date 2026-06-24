import { Router } from 'express';
import Prediction from '../models/Prediction.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const predictions = await Prediction.find()
      .sort({ createdAt: -1 })
      .populate('predictedBy', 'username displayName');
    res.json({ predictions });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }
    const prediction = await Prediction.create({
      title: title.trim(),
      predictedBy: req.user.id
    });
    const populated = await prediction.populate('predictedBy', 'username displayName');
    res.status(201).json({ prediction: populated });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id/resolve', authMiddleware, async (req, res) => {
  try {
    const { result } = req.body;
    if (!['correct', 'wrong'].includes(result)) {
      return res.status(400).json({ error: 'Result must be "correct" or "wrong"' });
    }
    const prediction = await Prediction.findByIdAndUpdate(
      req.params.id,
      { result, resolvedAt: new Date() },
      { new: true }
    ).populate('predictedBy', 'username displayName');

    if (!prediction) return res.status(404).json({ error: 'Prediction not found' });
    res.json({ prediction });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
