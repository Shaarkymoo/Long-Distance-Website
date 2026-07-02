import { Router } from 'express';
import QuizEntry from '../models/PersonalityQuiz.js';
import User from '../models/User.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// GET /api/quizzes — list quiz entries with sort + pagination
router.get('/', authMiddleware, async (req, res) => {
  try {
    const sort = req.query.sort === 'desc' ? -1 : 1; // default asc (oldest first)
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = { coupleId: req.user.coupleId };
    const [entries, total] = await Promise.all([
      QuizEntry.find(filter).sort({ createdAt: sort }).skip(skip).limit(limit),
      QuizEntry.countDocuments(filter),
    ]);

    // Look up partner name
    const partner = await User.findOne({ coupleId: req.user.coupleId, _id: { $ne: req.user.id } })
      .select('displayName');
    const partnerName = partner?.displayName || 'Partner';
    const myName = req.user.displayName || 'Me';

    res.json({
      entries,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      partnerName,
      myName,
    });
  } catch (err) {
    console.error('List quiz entries error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/quizzes — create a new quiz entry
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { quizTitle, myResult, partnerResult } = req.body;
    if (!quizTitle || !quizTitle.trim()) {
      return res.status(400).json({ error: 'Quiz title is required' });
    }
    const entry = await QuizEntry.create({
      quizTitle: quizTitle.trim(),
      addedBy: req.user.id,
      myResult: myResult || '',
      partnerResult: partnerResult || '',
      coupleId: req.user.coupleId,
    });
    res.status(201).json({ entry });
  } catch (err) {
    console.error('Create quiz entry error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/quizzes/:id — update a quiz entry
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const { quizTitle, myResult, partnerResult } = req.body;
    const update = {};
    if (quizTitle !== undefined) update.quizTitle = quizTitle.trim();
    if (myResult !== undefined) update.myResult = myResult;
    if (partnerResult !== undefined) update.partnerResult = partnerResult;

    const entry = await QuizEntry.findOneAndUpdate(
      { _id: req.params.id, coupleId: req.user.coupleId },
      { $set: update },
      { new: true }
    );
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    res.json({ entry });
  } catch (err) {
    console.error('Update quiz entry error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/quizzes/:id — delete a quiz entry
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const entry = await QuizEntry.findOneAndDelete({ _id: req.params.id, coupleId: req.user.coupleId });
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    res.json({ message: 'Entry deleted' });
  } catch (err) {
    console.error('Delete quiz entry error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
