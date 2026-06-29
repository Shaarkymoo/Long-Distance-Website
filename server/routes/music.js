import { Router } from 'express';
import MusicLink from '../models/MusicLink.js';
import { authMiddleware } from '../middleware/auth.js';

// Helper to determine embed type and extract embed ID
function parseMusicUrl(url) {
  const trimmed = url.trim();

  // YouTube: https://www.youtube.com/watch?v=VIDEO_ID or https://youtu.be/VIDEO_ID
  const ytMatch = trimmed.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
  );
  if (ytMatch) {
    return { type: 'youtube', embedId: ytMatch[1] };
  }

  // Spotify track: https://open.spotify.com/track/TRACK_ID
  const spMatch = trimmed.match(/open\.spotify\.com\/track\/([a-zA-Z0-9]+)/);
  if (spMatch) {
    return { type: 'spotify', embedId: spMatch[1] };
  }

  // Spotify playlist/album: https://open.spotify.com/playlist/... or /album/...
  const spPlaylist = trimmed.match(/open\.spotify\.com\/(playlist|album)\/([a-zA-Z0-9]+)/);
  if (spPlaylist) {
    return { type: 'spotify', embedId: `${spPlaylist[1]}/${spPlaylist[2]}` };
  }

  return null;
}

const router = Router();

// GET /api/music — list all music links
router.get('/', authMiddleware, async (req, res) => {
  try {
    const music = await MusicLink.find({ coupleId: req.user.coupleId })
      .sort({ createdAt: -1 })
      .populate('addedBy', 'username displayName');
    res.json({ music });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/music — add a music link
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, url } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required' });
    if (!url || !url.trim()) return res.status(400).json({ error: 'URL is required' });

    const parsed = parseMusicUrl(url);
    if (!parsed) {
      return res.status(400).json({
        error: 'Invalid URL. Supported: YouTube video, Spotify track/playlist/album'
      });
    }

    const music = await MusicLink.create({
      title: title.trim(),
      url: url.trim(),
      embedType: parsed.type,
      addedBy: req.user.id,
      coupleId: req.user.coupleId
    });
    const populated = await music.populate('addedBy', 'username displayName');
    res.status(201).json({ music: populated });
  } catch (err) {
    console.error('Create music error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/music/:id — remove a music link
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const music = await MusicLink.findOneAndDelete({
      _id: req.params.id,
      addedBy: req.user.id,
      coupleId: req.user.coupleId
    });
    if (!music) return res.status(404).json({ error: 'Not found or not yours' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
