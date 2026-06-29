import { Router } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Couple from '../models/Couple.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// GET /api/auth/status — check if any users exist (for setup vs login routing)
router.get('/status', async (req, res) => {
  try {
    const count = await User.countDocuments();
    res.json({ hasUsers: count > 0 });
  } catch (err) {
    console.error('Status error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/setup — first-run setup: create 2 accounts with the same plain-text password
router.post('/setup', async (req, res) => {
  try {
    const { username1, username2, password } = req.body;

    if (!username1 || !username1.trim()) {
      return res.status(400).json({ error: 'First username is required' });
    }
    if (!username2 || !username2.trim()) {
      return res.status(400).json({ error: 'Second username is required' });
    }
    if (username1.trim() === username2.trim()) {
      return res.status(400).json({ error: 'Usernames must be different' });
    }
    if (!password || password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }

    // Check if either username already exists
    const existing = await User.findOne({
      username: { $in: [username1.trim(), username2.trim()] }
    });
    if (existing) {
      return res.status(400).json({ error: `Username "${existing.username}" already exists` });
    }

    const couple = await Couple.create({
      name: `${username1.trim()} & ${username2.trim()}`,
    });

    const users = await User.insertMany([
      { username: username1.trim(), password: password, displayName: username1.trim(), coupleId: couple._id },
      { username: username2.trim(), password: password, displayName: username2.trim(), coupleId: couple._id },
    ]);

    res.json({
      message: 'Accounts created',
      users: users.map(u => ({ id: u._id, username: u.username, displayName: u.displayName })),
      coupleId: couple._id,
    });
  } catch (err) {
    console.error('Setup error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login — verify password (plain text), return JWT
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Plain text comparison
    if (password !== user.password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username, displayName: user.displayName, coupleId: user.coupleId },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user._id, username: user.username, displayName: user.displayName, coupleId: user.coupleId }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/me — return current user from JWT
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('username displayName coupleId');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: { id: user._id, username: user.username, displayName: user.displayName, coupleId: user.coupleId } });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
