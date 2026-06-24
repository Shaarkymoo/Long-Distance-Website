import { Router } from 'express';
import Notebook from '../models/Notebook.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// GET /api/notebook — get the shared notebook content
router.get('/', authMiddleware, async (req, res) => {
  try {
    let notebook = await Notebook.findOne();
    if (!notebook) {
      notebook = await Notebook.create({ content: '' });
    }
    res.json({ content: notebook.content, updatedAt: notebook.updatedAt });
  } catch (err) {
    console.error('Notebook GET error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/notebook — update notebook content
router.put('/', authMiddleware, async (req, res) => {
  try {
    const { content } = req.body;
    if (content === undefined) {
      return res.status(400).json({ error: 'Content is required' });
    }

    let notebook = await Notebook.findOne();
    if (!notebook) {
      notebook = new Notebook();
    }

    notebook.content = content;
    notebook.updatedBy = req.user.id;
    notebook.updatedAt = new Date();
    await notebook.save();

    res.json({ content: notebook.content, updatedAt: notebook.updatedAt });
  } catch (err) {
    console.error('Notebook PUT error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
