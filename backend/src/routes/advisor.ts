import { Router, Request, Response, NextFunction } from 'express';
import {
  generateAnalysis,
  chatWithAdvisor,
  getRecentInsights,
  markInsightRead
} from '../services/advisorService';

const router = Router();

router.get('/insights', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const insights = await getRecentInsights(20);
    res.json(insights);
  } catch (err) {
    next(err);
  }
});

router.get('/analysis', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const analysis = await generateAnalysis();
    res.json(analysis);
  } catch (err) {
    next(err);
  }
});

router.post('/chat', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) {
      res.status(400).json({ error: 'Mensaje requerido' });
      return;
    }
    const reply = await chatWithAdvisor(message);
    res.json({ reply });
  } catch (err) {
    next(err);
  }
});

router.patch('/insights/:id/read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await markInsightRead(req.params['id'] as string);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
