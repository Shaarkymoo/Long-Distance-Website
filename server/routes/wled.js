import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

const WLED_IP = process.env.WLED_IP || '';
const WLED_BASE = WLED_IP ? `http://${WLED_IP}` : null;

async function wledRequest(path) {
  if (!WLED_BASE) return { error: 'WLED_IP not configured', available: false };
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${WLED_BASE}${path}`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return { error: `WLED responded with ${res.status}`, available: false };
    const data = await res.json();
    return { ...data, available: true };
  } catch (err) {
    return { error: err.message, available: false };
  }
}

// POST /api/wled/toggle — toggle light on/off
router.post('/toggle', authMiddleware, async (req, res) => {
  const result = await wledRequest('/win');
  res.json(result);
});

// POST /api/wled/on — turn light ON
router.post('/on', authMiddleware, async (req, res) => {
  const result = await wledRequest('/win&ON');
  res.json(result);
});

// POST /api/wled/off — turn light OFF
router.post('/off', authMiddleware, async (req, res) => {
  const result = await wledRequest('/win&OFF');
  res.json(result);
});

// GET /api/wled/status — check current WLED state
router.get('/status', authMiddleware, async (req, res) => {
  const result = await wledRequest('/json');
  res.json({
    available: result.available,
    on: result?.state?.on ?? null,
    brightness: result?.state?.bri ?? null,
    ip: WLED_IP || null,
    error: !WLED_IP ? 'WLED_IP not configured' : result.error || null
  });
});

export default router;
