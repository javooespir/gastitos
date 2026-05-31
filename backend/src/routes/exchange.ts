import { Router, Request, Response, NextFunction } from 'express';
import { getExchangeRates, refreshRates } from '../services/exchangeService';
import { ALL_CATEGORIES, CUENTAS } from '../types';

const router = Router();

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rates = await getExchangeRates();
    res.json(rates);
  } catch (err) {
    next(err);
  }
});

// Endpoint separado para categorías y cuentas
export const metaRouter = Router();

metaRouter.get('/categories', (_req: Request, res: Response) => {
  res.json({ categories: ALL_CATEGORIES });
});

metaRouter.get('/accounts', (_req: Request, res: Response) => {
  res.json({ accounts: CUENTAS });
});

// Cron endpoint — llamado a las 11am Argentina (14:00 UTC) por Vercel
router.post('/refresh', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rates = await refreshRates();
    res.json({ ok: true, rates });
  } catch (err) {
    next(err);
  }
});

export default router;
