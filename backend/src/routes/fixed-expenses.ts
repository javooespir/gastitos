import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

const router = Router();

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const expenses = await prisma.fixedExpense.findMany({
      where: { activo: true },
      orderBy: { diaMes: 'asc' }
    });
    const now = new Date();
    // Annotate with pagadoEsteMes
    const result = expenses.map(e => ({
      ...e,
      pagadoEsteMes: e.ultimoPago
        ? e.ultimoPago.getFullYear() === now.getFullYear() && e.ultimoPago.getMonth() === now.getMonth()
        : false
    }));
    res.json(result);
  } catch (err) { next(err); }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { nombre, monto, categoria, diaMes } = req.body;
    const expense = await prisma.fixedExpense.create({
      data: { nombre, monto: Number(monto), categoria, diaMes: Number(diaMes) || 1 }
    });
    res.status(201).json({ ...expense, pagadoEsteMes: false });
  } catch (err) { next(err); }
});

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { nombre, monto, categoria, diaMes, activo } = req.body;
    const expense = await prisma.fixedExpense.update({
      where: { id: req.params['id'] as string },
      data: {
        ...(nombre !== undefined && { nombre }),
        ...(monto !== undefined && { monto: Number(monto) }),
        ...(categoria !== undefined && { categoria }),
        ...(diaMes !== undefined && { diaMes: Number(diaMes) }),
        ...(activo !== undefined && { activo })
      }
    });
    const now = new Date();
    res.json({
      ...expense,
      pagadoEsteMes: expense.ultimoPago
        ? expense.ultimoPago.getFullYear() === now.getFullYear() && expense.ultimoPago.getMonth() === now.getMonth()
        : false
    });
  } catch (err) { next(err); }
});

// Mark as paid this month
router.post('/:id/pagar', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const expense = await prisma.fixedExpense.update({
      where: { id: req.params['id'] as string },
      data: { ultimoPago: new Date() }
    });
    res.json({ ...expense, pagadoEsteMes: true });
  } catch (err) { next(err); }
});

// Unmark paid
router.post('/:id/unpagar', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const expense = await prisma.fixedExpense.update({
      where: { id: req.params['id'] as string },
      data: { ultimoPago: null }
    });
    res.json({ ...expense, pagadoEsteMes: false });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.fixedExpense.update({
      where: { id: req.params['id'] as string },
      data: { activo: false }
    });
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
