import prisma from '../lib/prisma';
import { TransactionInput, TransactionFilters } from '../types';
import { getExchangeRates, arsToUsd } from './exchangeService';

export async function createTransaction(input: TransactionInput) {
  const { blue } = await getExchangeRates();
  const montoUSD = arsToUsd(input.montoARS, blue);

  return prisma.transaction.create({
    data: {
      fecha: input.fecha ? new Date(input.fecha) : new Date(),
      categoria: input.categoria,
      montoARS: input.montoARS,
      montoUSD,
      tipo: input.tipo,
      descripcion: input.descripcion,
      cuenta: input.cuenta ?? 'Billetera',
      etiquetas: JSON.stringify(input.etiquetas ?? [])
    }
  });
}

export async function listTransactions(filters: TransactionFilters = {}) {
  const { startDate, endDate, categoria, tipo, cuenta, page = 1, limit = 50 } = filters;

  const where: any = {};
  if (startDate) where.fecha = { ...where.fecha, gte: new Date(startDate) };
  if (endDate) where.fecha = { ...where.fecha, lte: new Date(endDate) };
  if (categoria) where.categoria = categoria;
  if (tipo) where.tipo = tipo;
  if (cuenta) where.cuenta = cuenta;

  const [total, transactions] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      orderBy: { fecha: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    })
  ]);

  return {
    data: transactions.map(t => ({
      ...t,
      etiquetas: JSON.parse(t.etiquetas)
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit)
  };
}

export async function updateTransaction(id: string, input: Partial<TransactionInput>) {
  const existing = await prisma.transaction.findUnique({ where: { id } });
  if (!existing) throw new Error('Transacción no encontrada');

  let montoUSD = existing.montoUSD;
  if (input.montoARS !== undefined) {
    const { blue } = await getExchangeRates();
    montoUSD = arsToUsd(input.montoARS, blue);
  }

  return prisma.transaction.update({
    where: { id },
    data: {
      ...(input.fecha && { fecha: new Date(input.fecha) }),
      ...(input.categoria && { categoria: input.categoria }),
      ...(input.montoARS !== undefined && { montoARS: input.montoARS, montoUSD }),
      ...(input.tipo && { tipo: input.tipo }),
      ...(input.descripcion !== undefined && { descripcion: input.descripcion }),
      ...(input.cuenta && { cuenta: input.cuenta }),
      ...(input.etiquetas && { etiquetas: JSON.stringify(input.etiquetas) })
    }
  });
}

export async function deleteTransaction(id: string) {
  return prisma.transaction.delete({ where: { id } });
}

export async function getMonthlySummary(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);

  const transactions = await prisma.transaction.findMany({
    where: { fecha: { gte: start, lte: end } }
  });

  const gastos = transactions.filter(t => t.tipo === 'gasto');
  const ingresos = transactions.filter(t => t.tipo === 'ingreso');
  const ahorros = transactions.filter(t => t.tipo === 'ahorro' || t.tipo === 'inversion');

  const categorySums: Record<string, number> = {};
  for (const t of gastos) {
    categorySums[t.categoria] = (categorySums[t.categoria] ?? 0) + t.montoARS;
  }

  return {
    totalGastadoARS: gastos.reduce((s, t) => s + t.montoARS, 0),
    totalGastadoUSD: gastos.reduce((s, t) => s + t.montoUSD, 0),
    totalIngresadoARS: ingresos.reduce((s, t) => s + t.montoARS, 0),
    totalIngresadoUSD: ingresos.reduce((s, t) => s + t.montoUSD, 0),
    totalAhorradoARS: ahorros.reduce((s, t) => s + t.montoARS, 0),
    totalAhorradoUSD: ahorros.reduce((s, t) => s + t.montoUSD, 0),
    categorySums,
    transactionCount: transactions.length
  };
}

export async function getLast6MonthsSummary() {
  const results = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const summary = await getMonthlySummary(date.getFullYear(), date.getMonth() + 1);
    results.push({
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      label: date.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' }),
      ...summary
    });
  }
  return results;
}
