import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

// Seed usa su propio cliente ya que corre de forma independiente
const prisma = new PrismaClient();

async function seed() {
  console.log('Seeding database...');

  // Exchange rate cache
  await prisma.exchangeRateCache.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', rateBlue: 1430, rateOficial: 1404 },
    update: { rateBlue: 1430, rateOficial: 1404 }
  });

  // Limpiar TODOS los datos existentes
  await prisma.insight.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.goal.deleteMany();

  const rate = 1430;

  /* eslint-disable no-irregular-whitespace */
  const A = 'Alimentación';  // Alimentación
  const C = 'Café';          // Café
  const Ed = 'Educación';   // Educación
  const N = 'Néstor';        // Néstor
  const Cr = 'Crédito';     // Crédito

  const transactions = [
    // Mayo 2026
    { fecha: new Date('2026-05-05'), categoria: 'Salario',       montoARS: 800000, tipo: 'ingreso',   descripcion: 'Mayo 2026',          cuenta: 'Banco' },
    { fecha: new Date('2026-05-10'), categoria: 'Emprendimiento',montoARS: 120000, tipo: 'ingreso',   descripcion: 'Freelance',           cuenta: 'Mercado Pago' },
    { fecha: new Date('2026-05-01'), categoria: 'Casa',          montoARS:  95000, tipo: 'gasto',     descripcion: 'Alquiler mayo',       cuenta: 'Banco' },
    { fecha: new Date('2026-05-08'), categoria: A,               montoARS:  45000, tipo: 'gasto',     descripcion: 'Super Coto',          cuenta: 'Banco' },
    { fecha: new Date('2026-05-15'), categoria: A,               montoARS:  38000, tipo: 'gasto',     descripcion: 'Carrefour',           cuenta: 'Banco' },
    { fecha: new Date('2026-05-11'), categoria: 'Salidas',       montoARS:  25000, tipo: 'gasto',     descripcion: 'Cena con amigos',     cuenta: 'Efectivo' },
    { fecha: new Date('2026-05-12'), categoria: C,               montoARS:   8500, tipo: 'gasto',     descripcion: 'Honduras cafe',       cuenta: 'Mercado Pago' },
    { fecha: new Date('2026-05-09'), categoria: 'Auto',          montoARS:  32000, tipo: 'gasto',     descripcion: 'Nafta y service',     cuenta: 'Banco' },
    { fecha: new Date('2026-05-14'), categoria: 'Farmacia',      montoARS:  15000, tipo: 'gasto',     descripcion: 'Medicamentos',        cuenta: 'Billetera' },
    { fecha: new Date('2026-05-03'), categoria: 'Ocio',          montoARS:  18000, tipo: 'gasto',     descripcion: 'Netflix + Spotify',   cuenta: 'Banco' },
    { fecha: new Date('2026-05-20'), categoria: 'Ropa',          montoARS:  42000, tipo: 'gasto',     descripcion: 'Zapatillas Adidas',   cuenta: 'Tarjeta' },
    { fecha: new Date('2026-05-01'), categoria: 'Rutina',        montoARS:  12000, tipo: 'gasto',     descripcion: 'Gimnasio',            cuenta: 'Banco' },
    { fecha: new Date('2026-05-18'), categoria: 'Salud',         montoARS:  22000, tipo: 'gasto',     descripcion: 'Medico clinico',      cuenta: 'Banco' },
    { fecha: new Date('2026-05-22'), categoria: 'Familia',       montoARS:  30000, tipo: 'gasto',     descripcion: 'Cumple mama',         cuenta: 'Efectivo' },
    { fecha: new Date('2026-05-25'), categoria: 'Ahorro p/viajar', montoARS: 100000, tipo: 'ahorro',  descripcion: 'Meta Viajes 2027',    cuenta: 'Banco' },
    { fecha: new Date('2026-05-25'), categoria: 'Ahorro p/viajar', montoARS:  80000, tipo: 'inversion',descripcion: 'Plazo fijo Fondo Largo', cuenta: 'Banco' },
    // Abril 2026
    { fecha: new Date('2026-04-05'), categoria: 'Salario',       montoARS: 750000, tipo: 'ingreso',   descripcion: 'Abril 2026',          cuenta: 'Banco' },
    { fecha: new Date('2026-04-08'), categoria: A,               montoARS:  52000, tipo: 'gasto',     descripcion: 'Super mercado',       cuenta: 'Banco' },
    { fecha: new Date('2026-04-01'), categoria: 'Casa',          montoARS:  90000, tipo: 'gasto',     descripcion: 'Alquiler abril',      cuenta: 'Banco' },
    { fecha: new Date('2026-04-15'), categoria: 'Salidas',       montoARS:  35000, tipo: 'gasto',     descripcion: 'Salidas finde',       cuenta: 'Efectivo' },
    { fecha: new Date('2026-04-20'), categoria: 'Auto',          montoARS:  26000, tipo: 'gasto',     descripcion: 'Nafta',               cuenta: 'Banco' },
    { fecha: new Date('2026-04-25'), categoria: 'Ahorro p/viajar', montoARS: 90000, tipo: 'ahorro',   descripcion: 'Ahorro abril',        cuenta: 'Banco' },
    // Marzo 2026
    { fecha: new Date('2026-03-05'), categoria: 'Salario',       montoARS: 700000, tipo: 'ingreso',   descripcion: 'Marzo 2026',          cuenta: 'Banco' },
    { fecha: new Date('2026-03-10'), categoria: A,               montoARS:  48000, tipo: 'gasto',     descripcion: 'Mercado marzo',       cuenta: 'Banco' },
    { fecha: new Date('2026-03-01'), categoria: 'Casa',          montoARS:  88000, tipo: 'gasto',     descripcion: 'Alquiler marzo',      cuenta: 'Banco' },
    { fecha: new Date('2026-03-20'), categoria: 'Auto',          montoARS:  28000, tipo: 'gasto',     descripcion: 'Nafta',               cuenta: 'Banco' },
    { fecha: new Date('2026-03-12'), categoria: 'Salidas',       montoARS:  22000, tipo: 'gasto',     descripcion: 'Salidas',             cuenta: 'Efectivo' },
    // Febrero 2026
    { fecha: new Date('2026-02-05'), categoria: 'Salario',       montoARS: 680000, tipo: 'ingreso',   descripcion: 'Febrero 2026',        cuenta: 'Banco' },
    { fecha: new Date('2026-02-10'), categoria: A,               montoARS:  44000, tipo: 'gasto',     descripcion: 'Mercado febrero',     cuenta: 'Banco' },
    { fecha: new Date('2026-02-01'), categoria: 'Casa',          montoARS:  85000, tipo: 'gasto',     descripcion: 'Alquiler febrero',    cuenta: 'Banco' },
    { fecha: new Date('2026-02-18'), categoria: 'Ropa',          montoARS:  35000, tipo: 'gasto',     descripcion: 'Ropa verano',         cuenta: 'Tarjeta' },
    // Enero 2026
    { fecha: new Date('2026-01-05'), categoria: 'Salario',       montoARS: 650000, tipo: 'ingreso',   descripcion: 'Enero 2026',          cuenta: 'Banco' },
    { fecha: new Date('2026-01-10'), categoria: A,               montoARS:  40000, tipo: 'gasto',     descripcion: 'Mercado enero',       cuenta: 'Banco' },
    { fecha: new Date('2026-01-01'), categoria: 'Casa',          montoARS:  82000, tipo: 'gasto',     descripcion: 'Alquiler enero',      cuenta: 'Banco' },
    { fecha: new Date('2026-01-15'), categoria: 'Ocio',          montoARS:  20000, tipo: 'gasto',     descripcion: 'Cine y salidas',      cuenta: 'Efectivo' },
  ];

  for (const t of transactions) {
    await prisma.transaction.create({
      data: {
        ...t,
        montoUSD: Math.round((t.montoARS / rate) * 100) / 100,
        etiquetas: '[]'
      } as any
    });
  }
  console.log(`Created ${transactions.length} transactions`);

  // Metas
  await prisma.goal.deleteMany();
  const goals = [
    { nombre: 'Viajes 2027', montoObjetivoUSD: 3000, fechaTargetInicio: new Date('2026-01-01'), fechaTargetFin: new Date('2027-06-30'), ahorroActualUSD: 1250 },
    { nombre: 'Fondo Largo Plazo', montoObjetivoUSD: 10000, fechaTargetInicio: new Date('2026-01-01'), fechaTargetFin: new Date('2029-12-31'), ahorroActualUSD: 560 }
  ];
  for (const g of goals) {
    await prisma.goal.create({ data: g });
  }
  console.log('Created 2 goals');

  console.log('Seed complete!');
  await prisma.$disconnect();
}

seed().catch(console.error);
