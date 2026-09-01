import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { healthRouter } from './routes/health.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 3001);

app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173', credentials: true }));
app.use(express.json());

app.use('/', healthRouter);

app.listen(port, '0.0.0.0', () => {
  console.log(`OrderFlow backend listening on http://localhost:${port}`);
});
