import { Router } from 'express';
const router = Router();

router.get('/random', (req, res) => {
  res.json({ status: 'ok' });
});

export default router;
