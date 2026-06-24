import { Router } from 'express';
import TriviaQuestion from '../models/TriviaQuestion.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// GET /api/trivia/questions — list questions with per-user status
router.get('/questions', authMiddleware, async (req, res) => {
  try {
    const questions = await TriviaQuestion.find()
      .sort({ createdAt: -1 })
      .populate('createdBy', 'username displayName')
      .populate('answeredBy.userId', 'username displayName');

    const result = questions.map(q => {
      const qObj = q.toObject();
      const userIdStr = req.user.id;
      const myAnswer = qObj.answeredBy.find(a => a.userId?._id?.toString() === userIdStr);
      const otherAnswer = qObj.answeredBy.find(a => a.userId?._id?.toString() !== userIdStr);

      return {
        _id: q._id,
        question: q.question,
        options: q.options,
        category: q.category,
        createdBy: q.createdBy,
        myAnswer: myAnswer || null,
        otherAnswered: !!otherAnswer,
        otherCorrect: otherAnswer ? otherAnswer.correct : null,
        // Only reveal correct answer if both have answered
        correctAnswer: qObj.answeredBy.length >= 2 ? q.correctAnswer : undefined,
        createdAt: q.createdAt
      };
    });
    res.json({ questions: result });
  } catch (err) {
    console.error('List trivia error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/trivia/questions — add a question
router.post('/questions', authMiddleware, async (req, res) => {
  try {
    const { question, options, correctAnswer, category } = req.body;
    if (!question || !question.trim()) return res.status(400).json({ error: 'Question is required' });
    if (!options || !Array.isArray(options) || options.length !== 4) return res.status(400).json({ error: 'Exactly 4 options required' });
    if (!correctAnswer || !options.includes(correctAnswer)) return res.status(400).json({ error: 'Correct answer must be one of the options' });

    const q = await TriviaQuestion.create({
      question: question.trim(),
      options,
      correctAnswer,
      category: category || 'general',
      createdBy: req.user.id,
      answeredBy: []
    });
    res.status(201).json({ question: q });
  } catch (err) {
    console.error('Create trivia error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/trivia/questions/:id/answer — submit answer
router.post('/questions/:id/answer', authMiddleware, async (req, res) => {
  try {
    const { answer } = req.body;
    if (!answer) return res.status(400).json({ error: 'Answer is required' });

    const question = await TriviaQuestion.findById(req.params.id);
    if (!question) return res.status(404).json({ error: 'Question not found' });

    const alreadyAnswered = question.answeredBy.find(a => a.userId.toString() === req.user.id);
    if (alreadyAnswered) return res.status(400).json({ error: 'Already answered' });

    const correct = answer === question.correctAnswer;
    question.answeredBy.push({ userId: req.user.id, correct });
    await question.save();

    res.json({ correct, correctAnswer: correct ? undefined : question.correctAnswer });
  } catch (err) {
    console.error('Answer trivia error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/trivia/leaderboard — show correct counts per user
router.get('/leaderboard', authMiddleware, async (req, res) => {
  try {
    const questions = await TriviaQuestion.find().populate('answeredBy.userId', 'username displayName');
    const counts = {};

    questions.forEach(q => {
      q.answeredBy.forEach(a => {
        if (a.correct) {
          const uid = a.userId?._id?.toString() || a.userId?.toString();
          const name = a.userId?.displayName || a.userId?.username || 'Unknown';
          if (!counts[uid]) counts[uid] = { name, correct: 0 };
          counts[uid].correct++;
        }
      });
    });

    const leaderboard = Object.entries(counts).map(([id, data]) => ({
      userId: id,
      name: data.name,
      correct: data.correct
    })).sort((a, b) => b.correct - a.correct);

    res.json({ leaderboard });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
