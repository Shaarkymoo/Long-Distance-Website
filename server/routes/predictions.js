import { Router } from 'express';
import Bet from '../models/Prediction.js';
import Couple from '../models/Couple.js';
import User from '../models/User.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// GET / — bets + scoreboard + settings
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [bets, couple] = await Promise.all([
      Bet.find({ coupleId: req.user.coupleId })
        .sort({ createdAt: -1 })
        .populate('challenger', 'username displayName')
        .populate('challenged', 'username displayName'),
      Couple.findById(req.user.coupleId),
    ]);

    // Compute scoreboard
    const scoreboard = {};
    for (const bet of bets) {
      if (!bet.winner) continue;
      const key = bet.winner.toString();
      scoreboard[key] = (scoreboard[key] || 0) + (bet.points || 1);
    }

    const users = await User.find({ coupleId: req.user.coupleId }).select('username displayName');
    const scores = users.map(u => ({
      userId: u._id,
      displayName: u.displayName || u.username,
      score: scoreboard[u._id.toString()] || 0,
    }));

    const winner = scores.length === 2 && couple.betFirstTo
      ? scores.find(s => s.score >= couple.betFirstTo) || null
      : null;

    res.json({
      bets,
      scores,
      settings: {
        firstTo: couple?.betFirstTo || 5,
        prize: couple?.betPrize || 'bragging rights',
      },
      winner,
    });
  } catch (err) {
    console.error('Bets GET error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST / — create a new bet (you challenge your partner)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { goal, points } = req.body;
    if (!goal || !goal.trim()) {
      return res.status(400).json({ error: 'Goal is required' });
    }

    // Find partner
    const partner = await User.findOne(
      { coupleId: req.user.coupleId, _id: { $ne: req.user.id } }
    );
    if (!partner) {
      return res.status(400).json({ error: 'No partner found' });
    }

    const bet = await Bet.create({
      goal: goal.trim(),
      challenger: req.user.id,
      challenged: partner._id,
      points: Math.max(1, parseInt(points) || 1),
      coupleId: req.user.coupleId,
    });

    const populated = await bet.populate('challenger', 'username displayName');
    res.status(201).json({ bet: populated });
  } catch (err) {
    console.error('Bets POST error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /:id/resolve — resolve a bet (challenger won or lost)
router.patch('/:id/resolve', authMiddleware, async (req, res) => {
  try {
    const { winner } = req.body;
    if (!['challenger', 'challenged'].includes(winner)) {
      return res.status(400).json({ error: 'Winner must be "challenger" or "challenged"' });
    }

    const bet = await Bet.findOne({ _id: req.params.id, coupleId: req.user.coupleId });
    if (!bet) return res.status(404).json({ error: 'Bet not found' });
    if (bet.winner) return res.status(400).json({ error: 'Bet already resolved' });

    const winnerId = winner === 'challenger' ? bet.challenger : bet.challenged;
    bet.winner = winnerId;
    bet.resolvedAt = new Date();
    await bet.save();

    const populated = await bet.populate(['challenger', 'challenged', 'winner'], 'username displayName');
    res.json({ bet: populated });
  } catch (err) {
    console.error('Bets resolve error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /settings — update bet settings
router.patch('/settings', authMiddleware, async (req, res) => {
  try {
    const { firstTo, prize } = req.body;
    const update = {};
    if (firstTo !== undefined) update.betFirstTo = Math.max(1, parseInt(firstTo) || 5);
    if (prize !== undefined) update.betPrize = prize.trim();

    const couple = await Couple.findByIdAndUpdate(
      req.user.coupleId,
      update,
      { new: true }
    );

    res.json({ settings: { firstTo: couple.betFirstTo, prize: couple.betPrize } });
  } catch (err) {
    console.error('Bets settings error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
