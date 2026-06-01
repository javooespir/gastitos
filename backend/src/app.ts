import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import transactionRoutes from './routes/transactions';
import goalRoutes from './routes/goals';
import advisorRoutes from './routes/advisor';
import exchangeRoutes, { metaRouter } from './routes/exchange';
import fixedExpenseRoutes from './routes/fixed-expenses';
import loanRoutes from './routes/loans';
import creditCardRoutes from './routes/credit-card';
import { errorHandler, notFound } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT ?? 3001;
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000';

app.use(cors({ origin: [FRONTEND_URL, 'http://localhost:3000', 'http://localhost:5173'] }));
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (_req, res) => {
  const dbUrl = process.env.DATABASE_URL || '';
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    db_set: !!dbUrl,
    db_prefix: dbUrl.substring(0, 15) || 'EMPTY'
  });
});

// Routes
app.use('/api/transactions', transactionRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/advisor', advisorRoutes);
app.use('/api/exchange-rate', exchangeRoutes);
app.use('/api/fixed-expenses', fixedExpenseRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/credit-card', creditCardRoutes);
app.use('/api', metaRouter);

app.use(notFound);
app.use(errorHandler);

if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`🚀 Backend corriendo en http://localhost:${PORT}`);
  });
}

export default app;
