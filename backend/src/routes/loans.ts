import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { createTransaction } from '../services/transactionService';

const router = Router();

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const loans = await prisma.loan.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        pagos: { orderBy: { numeroCuota: 'asc' } }
      }
    });
    res.json(loans);
  } catch (err) { next(err); }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      nombre, tipo, saldoActual, tasaAnual, esUVA,
      totalCuotas, cuotaPagada, montoCuotaActual,
      montoCuotaOriginal, fechaPrimeraCuota, diaPago
    } = req.body;
    const loan = await prisma.loan.create({
      data: {
        nombre, tipo,
        saldoActual: Number(saldoActual),
        tasaAnual: Number(tasaAnual),
        esUVA: Boolean(esUVA),
        totalCuotas: Number(totalCuotas),
        cuotaPagada: Number(cuotaPagada) || 0,
        montoCuotaActual: Number(montoCuotaActual),
        montoCuotaOriginal: Number(montoCuotaOriginal),
        fechaPrimeraCuota: new Date(fechaPrimeraCuota),
        diaPago: Number(diaPago) || 10
      }
    });
    res.status(201).json({ ...loan, pagos: [] });
  } catch (err) { next(err); }
});

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      nombre, tipo, saldoActual, tasaAnual, esUVA,
      totalCuotas, cuotaPagada, montoCuotaActual,
      montoCuotaOriginal, fechaPrimeraCuota, diaPago, estado
    } = req.body;
    const loan = await prisma.loan.update({
      where: { id: req.params['id'] as string },
      data: {
        ...(nombre !== undefined && { nombre }),
        ...(tipo !== undefined && { tipo }),
        ...(saldoActual !== undefined && { saldoActual: Number(saldoActual) }),
        ...(tasaAnual !== undefined && { tasaAnual: Number(tasaAnual) }),
        ...(esUVA !== undefined && { esUVA: Boolean(esUVA) }),
        ...(totalCuotas !== undefined && { totalCuotas: Number(totalCuotas) }),
        ...(cuotaPagada !== undefined && { cuotaPagada: Number(cuotaPagada) }),
        ...(montoCuotaActual !== undefined && { montoCuotaActual: Number(montoCuotaActual) }),
        ...(montoCuotaOriginal !== undefined && { montoCuotaOriginal: Number(montoCuotaOriginal) }),
        ...(fechaPrimeraCuota !== undefined && { fechaPrimeraCuota: new Date(fechaPrimeraCuota) }),
        ...(diaPago !== undefined && { diaPago: Number(diaPago) }),
        ...(estado !== undefined && { estado })
      },
      include: { pagos: { orderBy: { numeroCuota: 'asc' } } }
    });
    res.json(loan);
  } catch (err) { next(err); }
});

// Register a payment
router.post('/:id/pagos', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const loanId = req.params['id'] as string;
    const { numeroCuota, montoPagado, fecha, saldoActual } = req.body;

    // Get loan name for the transaction description
    const loan = await prisma.loan.findUnique({ where: { id: loanId } });
    if (!loan) return res.status(404).json({ error: 'Crédito no encontrado' });

    const fechaDate = new Date(fecha || Date.now());

    const payment = await prisma.loanPayment.create({
      data: {
        loanId,
        numeroCuota: Number(numeroCuota),
        montoPagado: Number(montoPagado),
        fecha: fechaDate
      }
    });

    // Update loan: cuotaPagada and optionally saldoActual
    const updateData: any = { cuotaPagada: Number(numeroCuota) };
    if (saldoActual !== undefined) updateData.saldoActual = Number(saldoActual);
    if (montoPagado !== undefined) updateData.montoCuotaActual = Number(montoPagado);

    const updatedLoan = await prisma.loan.update({
      where: { id: loanId },
      data: updateData,
      include: { pagos: { orderBy: { numeroCuota: 'asc' } } }
    });

    // Automatically create a gasto transaction for this payment
    await createTransaction({
      fecha: fechaDate.toISOString().split('T')[0],
      categoria: 'Crédito',
      montoARS: Number(montoPagado),
      tipo: 'gasto',
      descripcion: `Cuota ${numeroCuota} — ${loan.nombre}`,
      cuenta: 'Billetera',
      etiquetas: ['cuota', loan.tipo]
    });

    res.status(201).json({ payment, loan: updatedLoan });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.loan.update({
      where: { id: req.params['id'] as string },
      data: { estado: 'cancelado' }
    });
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
