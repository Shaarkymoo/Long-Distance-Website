import { Router } from 'express';
import PersonalityQuiz from '../models/PersonalityQuiz.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// GET /api/quizzes — list quizzes with status for current user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const quizzes = await PersonalityQuiz.find({ coupleId: req.user.coupleId }).sort({ createdAt: -1 });
    const result = quizzes.map(q => {
      const qObj = q.toObject();
      const answers = qObj.answers || {};
      const userIdStr = req.user.id;
      const myAnswers = answers[userIdStr];
      const otherAnswered = Object.keys(answers).some(k => k !== userIdStr);
      let status = 'not_taken';
      if (myAnswers) status = 'taken_by_me';
      if (myAnswers && otherAnswered) status = 'taken_by_both';
      if (myAnswers && Object.keys(answers).length >= 2) status = 'compare_ready';
      return {
        _id: q._id,
        quizName: q.quizName,
        questionCount: q.questions.length,
        status,
        createdAt: q.createdAt
      };
    });
    res.json({ quizzes: result });
  } catch (err) {
    console.error('List quizzes error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/quizzes — create a new quiz
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { quizName, questions } = req.body;
    if (!quizName || !quizName.trim()) {
      return res.status(400).json({ error: 'Quiz name is required' });
    }
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'At least one question is required' });
    }
    for (const q of questions) {
      if (!q.questionText || !q.options || q.options.length < 2) {
        return res.status(400).json({ error: 'Each question needs text and at least 2 options' });
      }
    }
    const quiz = await PersonalityQuiz.create({
      quizName: quizName.trim(),
      questions,
      answers: {},
      coupleId: req.user.coupleId
    });
    res.status(201).json({ quiz });
  } catch (err) {
    console.error('Create quiz error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/quizzes/:id — get quiz with current user's answers hidden from other user
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const quiz = await PersonalityQuiz.findOne({ _id: req.params.id, coupleId: req.user.coupleId });
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    const qObj = quiz.toObject();
    const userIdStr = req.user.id;
    const answers = qObj.answers || {};

    // Show only current user's responses, hide other user's
    const sanitizedAnswers = {};
    if (answers[userIdStr]) {
      sanitizedAnswers[userIdStr] = answers[userIdStr];
    }

    const result = {
      _id: quiz._id,
      quizName: quiz.quizName,
      questions: quiz.questions,
      answers: sanitizedAnswers,
      totalTakers: Object.keys(answers).length,
      createdAt: quiz.createdAt
    };

    res.json({ quiz: result });
  } catch (err) {
    console.error('Get quiz error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/quizzes/:id/answer — submit answers for current user
router.post('/:id/answer', authMiddleware, async (req, res) => {
  try {
    const { responses } = req.body;
    const quiz = await PersonalityQuiz.findOne({ _id: req.params.id, coupleId: req.user.coupleId });
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    if (!responses || !Array.isArray(responses)) {
      return res.status(400).json({ error: 'Responses array is required' });
    }
    if (responses.length !== quiz.questions.length) {
      return res.status(400).json({ error: `Expected ${quiz.questions.length} responses` });
    }

    const answers = quiz.answers || {};
    const userIdStr = req.user.id;
    answers[userIdStr] = { userId: req.user.id, responses };
    quiz.answers = answers;
    quiz.markModified('answers');
    await quiz.save();

    res.json({ message: 'Answers saved' });
  } catch (err) {
    console.error('Answer quiz error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/quizzes/:id/compare — show both users' answers side by side
router.get('/:id/compare', authMiddleware, async (req, res) => {
  try {
    const quiz = await PersonalityQuiz.findOne({ _id: req.params.id, coupleId: req.user.coupleId });
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    const qObj = quiz.toObject();
    const answers = qObj.answers || {};
    const answerKeys = Object.keys(answers);

    if (answerKeys.length < 2) {
      return res.json({ compare: null, message: 'Waiting for both users to answer' });
    }

    // Build side-by-side comparison
    const comparison = quiz.questions.map((q, i) => {
      const row = { question: q.questionText, options: q.options };
      answerKeys.forEach((userId, idx) => {
        const userLabel = idx === 0 ? 'user1' : 'user2';
        row[userLabel] = (answers[userId]?.responses || [])[i] || '(no answer)';
      });
      return row;
    });

    res.json({ compare: comparison });
  } catch (err) {
    console.error('Compare quiz error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
