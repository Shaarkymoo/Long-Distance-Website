import { Router } from 'express';
import WhiteboardCanvas from '../models/WhiteboardCanvas.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// GET /api/whiteboard — get current canvas strokes
router.get('/', authMiddleware, async (req, res) => {
  try {
    const canvas = await WhiteboardCanvas.findOne().sort({ updatedAt: -1 });
    res.json({ strokes: canvas?.strokes || [] });
  } catch (err) {
    console.error('Get whiteboard error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/whiteboard — replace all strokes (fallback, kept for compatibility)
router.put('/', authMiddleware, async (req, res) => {
  try {
    const { strokes } = req.body;
    if (!Array.isArray(strokes)) return res.status(400).json({ error: 'Strokes must be an array' });

    let canvas = await WhiteboardCanvas.findOne().sort({ updatedAt: -1 });
    if (!canvas) {
      canvas = new WhiteboardCanvas();
    }
    canvas.strokes = strokes;
    canvas.updatedAt = new Date();
    await canvas.save();
    res.json({ strokes: canvas.strokes });
  } catch (err) {
    console.error('Save whiteboard error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/whiteboard/clear — clear the canvas
router.post('/clear', authMiddleware, async (req, res) => {
  try {
    let canvas = await WhiteboardCanvas.findOne().sort({ updatedAt: -1 });
    if (!canvas) {
      canvas = new WhiteboardCanvas();
    }
    canvas.strokes = [];
    canvas.updatedAt = new Date();
    await canvas.save();
    res.json({ message: 'Canvas cleared' });
  } catch (err) {
    console.error('Clear whiteboard error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
