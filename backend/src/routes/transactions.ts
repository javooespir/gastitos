import { Router, Request, Response, NextFunction } from 'express';
import {
  createTransaction,
  listTransactions,
  updateTransaction,
  deleteTransaction,
  getMonthlySummary,
  getLast6MonthsSummary
} from '../services/transactionService';

const router = Router();

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const transaction = await createTransaction(req.body);
    res.status(201).json(transaction);
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = {
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      categoria: req.query.categoria as string,
      tipo: req.query.tipo as string,
      cuenta: req.query.cuenta as string,
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 50
    };
    const result = await listTransactions(filters);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/summary/monthly', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const year = Number(req.query.year ?? now.getFullYear());
    const month = Number(req.query.month ?? now.getMonth() + 1);
    const summary = await getMonthlySummary(year, month);
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

router.get('/summary/history', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const history = await getLast6MonthsSummary();
    res.json(history);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const transaction = await updateTransaction(req.params.id, req.body);
    res.json(transaction);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await deleteTransaction(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
