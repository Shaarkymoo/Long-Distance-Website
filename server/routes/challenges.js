import { Router } from 'express';
import Challenge from '../models/Challenge.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

const DEFAULT_CHALLENGES = [
  { text: 'Cook a new recipe together', category: 'fun' },
  { text: 'Go for a midnight walk', category: 'adventurous' },
  { text: 'Write each other love letters', category: 'romantic' },
  { text: 'Have a board game night', category: 'fun' },
  { text: 'Build a blanket fort and watch movies', category: 'fun' },
  { text: 'Go stargazing', category: 'romantic' },
  { text: 'Try a new hobby together', category: 'adventurous' },
  { text: 'Have a picnic in the park', category: 'romantic' },
  { text: "Do each other's makeup/hair", category: 'silly' },
  { text: 'Learn a TikTok dance together', category: 'silly' },
  { text: 'Go to a museum or gallery', category: 'fun' },
  { text: 'Take a pottery class together', category: 'adventurous' },
  { text: 'Plan a themed dinner night', category: 'fun' },
  { text: 'Write a song or poem together', category: 'romantic' },
  { text: 'Have a photoshoot together', category: 'fun' },
  { text: 'Go camping (even in the backyard)', category: 'adventurous' },
  { text: 'Recreate your first date', category: 'romantic' },
  { text: 'Have a silent day - communicate only through notes', category: 'silly' },
  { text: 'Try geocaching', category: 'adventurous' },
  { text: 'Make a time capsule together', category: 'fun' },
];

router.get('/random', authMiddleware, async (req, res) => {
  try {
    const challenge = await Challenge.findOneAndUpdate(
      { used: false },
      { used: true },
      { sort: { _id: 1 }, new: true }
    );
    if (!challenge) {
      return res.json({ challenge: null, message: 'All challenges completed! Reset to start over.' });
    }
    res.json({ challenge });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { challengeText, category } = req.body;
    if (!challengeText || !challengeText.trim()) {
      return res.status(400).json({ error: 'Challenge text is required' });
    }
    const challenge = await Challenge.create({
      challengeText: challengeText.trim(),
      category: category || 'fun'
    });
    res.status(201).json({ challenge });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/reset', authMiddleware, async (req, res) => {
  try {
    await Challenge.updateMany({}, { used: false });
    res.json({ message: 'All challenges reset' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

async function seedChallenges() {
  try {
    const count = await Challenge.countDocuments();
    if (count === 0) {
      await Challenge.insertMany(
        DEFAULT_CHALLENGES.map(c => ({ challengeText: c.text, category: c.category }))
      );
      console.log('Seeded challenges');
    }
  } catch (err) {
    console.error('Seed challenges error:', err.message);
  }
}
seedChallenges();

export default router;
