import { Router } from 'express';
import RippleRound from '../models/RippleRound.js';
import Score from '../models/Score.js';
import { authMiddleware } from '../middleware/auth.js';
import { callGemini } from '../services/gemini.js';

const router = Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const rounds = await RippleRound.find({ coupleId: req.user.coupleId })
      .populate('submissions.userId', 'displayName')
      .populate('createdBy', 'displayName')
      .sort({ createdAt: -1 });
    res.json({ rounds });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'Question is required' });
    }
    const round = await RippleRound.create({
      question: question.trim(),
      createdBy: req.user.id,
      coupleId: req.user.coupleId,
    });
    res.status(201).json({ round });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

async function judgeRound(round, coupleId) {
  if (round.submissions.length !== 2) return;

  const [subA, subB] = round.submissions;
  const userA = subA.userId;
  const userB = subB.userId;

  const { text, error } = await callGemini({
    systemPrompt: `You are an impartial judge. Given a question and two answers, decide which answer is better. Consider creativity, accuracy, and thoughtfulness. Return JSON: { "winnerId": "user1" | "user2" | null, "loserId": "user1" | "user2" | null, "verdict": "2-3 sentence explanation of your reasoning" }. If it is a tie, set both winnerId and loserId to null.`,
    history: [{
      author: 'user',
      content: `Question: ${round.question}\n\nAnswer from User A: ${subA.answer}\n\nAnswer from User B: ${subB.answer}`,
    }],
    maxOutputTokens: 600,
  });

  if (error || !text) {
    round.status = 'judging';
    await round.save();
    return;
  }

  try {
    const parsed = JSON.parse(text.replace(/```json\s*|```\s*$/g, '').trim());
    const winnerId = parsed.winnerId === 'user1' ? userA : parsed.winnerId === 'user2' ? userB : null;
    const loserId = parsed.loserId === 'user1' ? userA : parsed.loserId === 'user2' ? userB : null;

    const isWin = parsed.winnerId && parsed.loserId;
    round.results.push({
      userId: winnerId || userA,
      opponentId: loserId || userB,
      verdict: isWin ? 'win' : 'draw',
      explanation: parsed.verdict || '',
    });

    round.status = 'complete';
    await round.save();

    // Award score to winner (mutual win/lose → draw = no score change)
    if (isWin && winnerId) {
      await Score.findByIdAndUpdate(
        `${coupleId}_ripple`,
        { $inc: { total: 1 }, $setOnInsert: { coupleId } },
        { upsert: true, setDefaultsOnInsert: true }
      );
    }
  } catch {
    round.status = 'judging';
    await round.save();
  }
}

router.post('/:id/submit', authMiddleware, async (req, res) => {
  try {
    const round = await RippleRound.findOne({ _id: req.params.id, coupleId: req.user.coupleId });
    if (!round) {
      return res.status(404).json({ error: 'Round not found' });
    }
    if (round.status !== 'open') {
      return res.status(400).json({ error: 'Round is not open for submissions' });
    }

    const alreadySubmitted = round.submissions.some(
      s => s.userId.toString() === req.user.id
    );
    if (alreadySubmitted) {
      return res.status(400).json({ error: 'You have already submitted to this round' });
    }

    const { answer } = req.body;
    if (!answer || !answer.trim()) {
      return res.status(400).json({ error: 'Answer is required' });
    }

    round.submissions.push({
      userId: req.user.id,
      answer: answer.trim(),
    });

    round.markModified('submissions');
    await round.save();

    if (round.submissions.length === 2) {
      round.status = 'judging';
      await round.save();
      await judgeRound(await RippleRound.findOne({ _id: round._id, coupleId: req.user.coupleId }), req.user.coupleId);
    }

    const updated = await RippleRound.findOne({ _id: round._id, coupleId: req.user.coupleId })
      .populate('submissions.userId', 'displayName');
    res.json({ round: updated });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/judge', authMiddleware, async (req, res) => {
  try {
    const round = await RippleRound.findOne({ _id: req.params.id, coupleId: req.user.coupleId });
    if (!round) {
      return res.status(404).json({ error: 'Round not found' });
    }
    if (round.status !== 'judging') {
      return res.status(400).json({ error: 'Round is not in judging status' });
    }

    await judgeRound(round, req.user.coupleId);

    const updated = await RippleRound.findOne({ _id: round._id, coupleId: req.user.coupleId })
      .populate('submissions.userId', 'displayName');
    res.json({ round: updated });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const round = await RippleRound.findOne({ _id: req.params.id, coupleId: req.user.coupleId })
      .populate('submissions.userId', 'displayName')
      .populate('createdBy', 'displayName');
    if (!round) {
      return res.status(404).json({ error: 'Round not found' });
    }
    res.json({ round });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
