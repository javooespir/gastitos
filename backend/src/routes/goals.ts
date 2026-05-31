import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Enrich goals with computed ahorroTotalUSD
async function getGoalsWithTotals() {
  const goals = await prisma.goal.findMany({
    orderBy: { fechaTargetFin: 'asc' },
    include: {
      allocations: {
        include: {
          transaction: {
            select: { fecha: true, descripcion: true, tipo: true, montoARS: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  return goals.map(g => {
    const allocatedUSD = g.allocations.reduce((sum, a) => sum + a.montoUSD, 0);
    return {
      ...g,
      ahorroTotalUSD: g.ahorroActualUSD + allocatedUSD,
      allocatedUSD
    };
  });
}

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { nombre, montoObjetivoUSD, fechaTargetInicio, fechaTargetFin, ahorroActualUSD } = req.body;
    const goal = await prisma.goal.create({
      data: {
        nombre,
        montoObjetivoUSD: Number(montoObjetivoUSD),
        fechaTargetInicio: new Date(fechaTargetInicio),
        fechaTargetFin: new Date(fechaTargetFin),
        ahorroActualUSD: ahorroActualUSD ? Number(ahorroActualUSD) : 0
      }
    });
    res.status(201).json({ ...goal, ahorroTotalUSD: goal.ahorroActualUSD, allocatedUSD: 0, allocations: [] });
  } catch (err) {
    next(err);
  }
});

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const goals = await getGoalsWithTotals();
    res.json(goals);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { nombre, montoObjetivoUSD, fechaTargetInicio, fechaTargetFin, ahorroActualUSD, estado } = req.body;
    await prisma.goal.update({
      where: { id: req.params['id'] as string },
      data: {
        ...(nombre && { nombre }),
        ...(montoObjetivoUSD !== undefined && { montoObjetivoUSD: Number(montoObjetivoUSD) }),
        ...(fechaTargetInicio && { fechaTargetInicio: new Date(fechaTargetInicio) }),
        ...(fechaTargetFin && { fechaTargetFin: new Date(fechaTargetFin) }),
        ...(ahorroActualUSD !== undefined && { ahorroActualUSD: Number(ahorroActualUSD) }),
        ...(estado && { estado })
      }
    });
    const goals = await getGoalsWithTotals();
    const updated = goals.find(g => g.id === req.params['id']);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.goal.delete({ where: { id: req.params['id'] as string } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// Delete a specific allocation
router.delete('/allocations/:allocId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.goalAllocation.delete({ where: { id: req.params['allocId'] as string } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
