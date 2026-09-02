import express from 'express';
import cors from 'cors';
import { isOriginAllowed } from './utils/cors.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { restaurantRouter } from './routes/restaurants.js';
import { menuRouter } from './routes/menu.js';
import { orderRouter } from './routes/orders.js';
import { errorHandler } from './middleware/errorHandler.js';

export const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        console.warn(`[CORS] Rejected request from origin: ${origin}`);
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Set-Cookie'],
  })
);

app.use(express.json());
app.use('/', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/restaurants', restaurantRouter);
app.use('/api', menuRouter);
app.use('/api/orders', orderRouter);
app.use(errorHandler);