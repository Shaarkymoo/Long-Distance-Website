import { Router } from 'express';
import DailyPuzzle from '../models/DailyPuzzle.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// GET /api/dailypuzzles — list puzzles for recent dates (last 7 days)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const puzzles = await DailyPuzzle.find().sort({ date: -1, createdAt: -1 });
    // Group by date
    const grouped = {};
    puzzles.forEach(p => {
      if (!grouped[p.date]) grouped[p.date] = [];
      grouped[p.date].push({
        _id: p._id,
        title: p.title,
        link: p.link,
        puzzleType: p.puzzleType,
        completedBy: p.completedBy.map(id => id.toString()),
        date: p.date
      });
    });
    res.json({ puzzles: grouped });
  } catch (err) {
    console.error('List puzzles error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/dailypuzzles — add a puzzle link for a date
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, link, puzzleType, date } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required' });
    if (!link || !link.trim()) return res.status(400).json({ error: 'Link is required' });

    const puzzle = await DailyPuzzle.create({
      title: title.trim(),
      link: link.trim(),
      puzzleType: puzzleType || 'other',
      date: date || new Date().toISOString().split('T')[0],
      completedBy: []
    });
    res.status(201).json({ puzzle });
  } catch (err) {
    console.error('Create puzzle error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/dailypuzzles/:id/complete — toggle completion for current user
router.patch('/:id/complete', authMiddleware, async (req, res) => {
  try {
    const puzzle = await DailyPuzzle.findById(req.params.id);
    if (!puzzle) return res.status(404).json({ error: 'Puzzle not found' });

    const userIdStr = req.user.id;
    const idx = puzzle.completedBy.findIndex(id => id.toString() === userIdStr);
    if (idx > -1) {
      puzzle.completedBy.splice(idx, 1);
    } else {
      puzzle.completedBy.push(req.user.id);
    }
    await puzzle.save();

    res.json({
      completed: idx === -1,
      completedBy: puzzle.completedBy.map(id => id.toString())
    });
  } catch (err) {
    console.error('Toggle puzzle error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
