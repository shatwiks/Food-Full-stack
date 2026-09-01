import express from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { restaurantRouter } from './routes/restaurants.js';
import { menuRouter } from './routes/menu.js';
import { orderRouter } from './routes/orders.js';
import { errorHandler } from './middleware/errorHandler.js';

const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*') || allowedOrigins.some(allowed => allowed.includes('localhost') && origin.includes('localhost'))) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json());
app.use('/', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/restaurants', restaurantRouter);
app.use('/api', menuRouter);
app.use('/api/orders', orderRouter);
app.use(errorHandler);