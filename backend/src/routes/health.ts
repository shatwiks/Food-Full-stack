import { Router } from 'express';
import { getHealthStatus } from '../controllers/healthController.js';

export const healthRouter = Router();

healthRouter.get('/health', getHealthStatus);
