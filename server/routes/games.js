import { Router } from 'express';
import Game from '../models/Game.js';
import FavoriteGame from '../models/FavoriteGame.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// ===== User-added games CRUD =====

// GET /api/games — list all user-added games
router.get('/', authMiddleware, async (req, res) => {
  try {
    const games = await Game.find().sort({ createdAt: -1 });
    res.json({ games });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/games — add a game
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, description, link, tag, players } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
    if (!link || !link.trim()) return res.status(400).json({ error: 'Link is required' });

    // Generate slug from name
    let slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!slug) slug = 'game';

    // Ensure unique slug
    const existing = await Game.findOne({ slug });
    if (existing) {
      const count = await Game.countDocuments({ slug: new RegExp('^' + slug) });
      slug = slug + '-' + (count + 1);
    }

    const game = await Game.create({
      name: name.trim(),
      slug,
      description: (description || '').trim(),
      link: link.trim(),
      tag: (tag || 'other').trim().toLowerCase(),
      players: (players || '2+').trim(),
      addedBy: req.user.id,
    });

    res.status(201).json({ game });
  } catch (err) {
    console.error('Add game error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/games/:slug — delete a game (either user can delete)
router.delete('/:slug', authMiddleware, async (req, res) => {
  try {
    const game = await Game.findOneAndDelete({ slug: req.params.slug });
    if (!game) return res.status(404).json({ error: 'Game not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ===== Favorites =====

// GET /api/games/favorites — get current user's favorites
router.get('/favorites', authMiddleware, async (req, res) => {
  try {
    const favorites = await FavoriteGame.find({ userId: req.user.id });
    res.json({ favorites: favorites.map(f => f.gameSlug) });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/games/favorites — toggle a game as favorite
router.post('/favorites', authMiddleware, async (req, res) => {
  try {
    const { gameSlug } = req.body;
    if (!gameSlug) return res.status(400).json({ error: 'gameSlug is required' });

    const existing = await FavoriteGame.findOne({ userId: req.user.id, gameSlug });
    if (existing) {
      await existing.deleteOne();
      return res.json({ favorited: false, gameSlug });
    }

    await FavoriteGame.create({ userId: req.user.id, gameSlug });
    res.json({ favorited: true, gameSlug });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
