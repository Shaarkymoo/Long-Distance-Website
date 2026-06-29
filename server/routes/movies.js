import { Router } from 'express';
import Movie from '../models/Movie.js';
import User from '../models/User.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// GET /api/movies — list all movies, sorted by status
router.get('/', authMiddleware, async (req, res) => {
  try {
    const movies = await Movie.find({ coupleId: req.user.coupleId })
      .sort({ createdAt: -1 })
      .populate('suggestedBy', 'username displayName');
    res.json({ movies });
  } catch (err) {
    console.error('Movies GET error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/movies — suggest a new movie
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, link, notes } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const movie = await Movie.create({
      title: title.trim(),
      suggestedBy: req.user.id,
      link: link || '',
      notes: notes || '',
      coupleId: req.user.coupleId
    });

    const populated = await movie.populate('suggestedBy', 'username displayName');
    res.status(201).json({ movie: populated });
  } catch (err) {
    console.error('Movies POST error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/movies/:id/mark-watched — mark movie as watched by current user
router.patch('/:id/mark-watched', authMiddleware, async (req, res) => {
  try {
    const movie = await Movie.findOne({ _id: req.params.id, coupleId: req.user.coupleId });
    if (!movie) return res.status(404).json({ error: 'Movie not found' });

    const userId = req.user.id;
    const alreadyWatched = movie.watchedBy.some(id => id.toString() === userId);

    if (alreadyWatched) {
      // Unwatch
      movie.watchedBy.pull(userId);
    } else {
      movie.watchedBy.push(userId);
    }

    // Check if both watched → mark resolved
    const allUsers = await User.find({});
    const allWatched = allUsers.every(u =>
      movie.watchedBy.some(w => w.toString() === u._id.toString())
    );
    movie.resolved = allWatched;

    await movie.save();
    const populated = await movie.populate('suggestedBy', 'username displayName');
    res.json({ movie: populated });
  } catch (err) {
    console.error('Movies mark-watched error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/movies/debt — calculate movie debt
router.get('/debt', authMiddleware, async (req, res) => {
  try {
    const users = await User.find({});
    const movies = await Movie.find({ coupleId: req.user.coupleId });

    const watchCounts = {};
    for (const user of users) {
      watchCounts[user._id.toString()] = {
        userId: user._id,
        username: user.username,
        displayName: user.displayName,
        watched: 0
      };
    }

    for (const movie of movies) {
      for (const watcherId of movie.watchedBy) {
        const key = watcherId.toString();
        if (watchCounts[key]) {
          watchCounts[key].watched++;
        }
      }
    }

    const counts = Object.values(watchCounts);
    let debtor = null;
    let creditor = null;
    let amount = 0;

    if (counts.length === 2) {
      const diff = counts[0].watched - counts[1].watched;
      if (diff > 0) {
        debtor = counts[1];
        creditor = counts[0];
        amount = diff;
      } else if (diff < 0) {
        debtor = counts[0];
        creditor = counts[1];
        amount = Math.abs(diff);
      }
    }

    res.json({
      debtor: debtor ? { name: debtor.displayName || debtor.username, watched: debtor.watched } : null,
      creditor: creditor ? { name: creditor.displayName || creditor.username, watched: creditor.watched } : null,
      amount,
      settled: amount === 0,
      counts: counts.map(c => ({ name: c.displayName || c.username, watched: c.watched }))
    });
  } catch (err) {
    console.error('Movies debt error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
