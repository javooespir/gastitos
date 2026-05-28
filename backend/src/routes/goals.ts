import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

const router = Router();

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { nombre, montoObjetivoUSD, fechaTargetInicio, fechaTargetFin } = req.body;
    const goal = await prisma.goal.create({
      data: {
        nombre,
        montoObjetivoUSD: Number(montoObjetivoUSD),
        fechaTargetInicio: new Date(fechaTargetInicio),
        fechaTargetFin: new Date(fechaTargetFin),
        ahorroActualUSD: 0
      }
    });
    res.status(201).json(goal);
  } catch (err) {
    next(err);
  }
});

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const goals = await prisma.goal.findMany({ orderBy: { fechaTargetFin: 'asc' } });
    res.json(goals);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { nombre, montoObjetivoUSD, fechaTargetInicio, fechaTargetFin, ahorroActualUSD, estado } = req.body;
    const goal = await prisma.goal.update({
      where: { id: req.params.id },
      data: {
        ...(nombre && { nombre }),
        ...(montoObjetivoUSD !== undefined && { montoObjetivoUSD: Number(montoObjetivoUSD) }),
        ...(fechaTargetInicio && { fechaTargetInicio: new Date(fechaTargetInicio) }),
        ...(fechaTargetFin && { fechaTargetFin: new Date(fechaTargetFin) }),
        ...(ahorroActualUSD !== undefined && { ahorroActualUSD: Number(ahorroActualUSD) }),
        ...(estado && { estado })
      }
    });
    res.json(goal);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.goal.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
