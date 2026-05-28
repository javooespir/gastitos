import { PrismaClient } from '@prisma/client';

// Singleton para evitar múltiples conexiones SQLite (causa deadlocks)
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
});

export default prisma;
