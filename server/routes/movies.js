import { Router } from 'express';
import Movie from '../models/Movie.js';
import User from '../models/User.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// GET /api/movies — list movies for this couple, split by direction
router.get('/', authMiddleware, async (req, res) => {
  try {
    const movies = await Movie.find({ coupleId: req.user.coupleId })
      .sort({ createdAt: -1 })
      .populate('assignedBy', 'username displayName')
      .populate('assignedTo', 'username displayName');

    const assignedByMe = movies.filter(
      m => m.assignedBy?._id.toString() === req.user.id
    );
    const assignedToMe = movies.filter(
      m => m.assignedTo?._id.toString() === req.user.id
    );

    // Find partner info
    const partner = await User.findOne(
      { coupleId: req.user.coupleId, _id: { $ne: req.user.id } }
    ).select('username displayName');

    res.json({
      movies,
      assignedByMe,
      assignedToMe,
      partner: partner ? { id: partner._id, username: partner.username, displayName: partner.displayName } : null,
    });
  } catch (err) {
    console.error('Movies GET error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/movies — assign a movie for your partner to watch
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, link, notes } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Find partner (the other user in the couple)
    const partner = await User.findOne(
      { coupleId: req.user.coupleId, _id: { $ne: req.user.id } }
    );
    if (!partner) {
      return res.status(400).json({ error: 'No partner found in your couple' });
    }

    const movie = await Movie.create({
      title: title.trim(),
      assignedBy: req.user.id,
      assignedTo: partner._id,
      link: link || '',
      notes: notes || '',
      coupleId: req.user.coupleId,
    });

    const populated = await movie.populate('assignedBy', 'username displayName');
    res.status(201).json({ movie: populated });
  } catch (err) {
    console.error('Movies POST error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/movies/:id/mark-watched — mark movie as watched (only assignee)
router.patch('/:id/mark-watched', authMiddleware, async (req, res) => {
  try {
    const movie = await Movie.findOne({ _id: req.params.id, coupleId: req.user.coupleId });
    if (!movie) return res.status(404).json({ error: 'Movie not found' });

    // Only the assignee (person it was assigned to) can mark it watched
    if (movie.assignedTo.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Only the person this movie was assigned to can mark it watched' });
    }

    movie.watched = !movie.watched;
    movie.watchedAt = movie.watched ? new Date() : null;
    await movie.save();

    const populated = await movie.populate('assignedBy', 'username displayName');
    res.json({ movie: populated });
  } catch (err) {
    console.error('Movies mark-watched error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
