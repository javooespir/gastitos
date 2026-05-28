import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import transactionRoutes from './routes/transactions';
import goalRoutes from './routes/goals';
import advisorRoutes from './routes/advisor';
import exchangeRoutes, { metaRouter } from './routes/exchange';
import { errorHandler, notFound } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT ?? 3001;
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000';

app.use(cors({ origin: [FRONTEND_URL, 'http://localhost:3000', 'http://localhost:5173'] }));
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Routes
app.use('/api/transactions', transactionRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/advisor', advisorRoutes);
app.use('/api/exchange-rate', exchangeRoutes);
app.use('/api', metaRouter);

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Backend corriendo en http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
});

export default app;
