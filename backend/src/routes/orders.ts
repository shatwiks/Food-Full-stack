import { Router } from 'express';
import { createOrder, getOrder, listOrders, updateOrderStatus } from '../controllers/orderController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const orderRouter = Router();
orderRouter.post('/', requireAuth, requireRole('CUSTOMER'), createOrder);
orderRouter.get('/', requireAuth, requireRole('CUSTOMER', 'RESTAURANT_OWNER', 'ADMIN'), listOrders);
orderRouter.get('/:id', requireAuth, requireRole('CUSTOMER', 'RESTAURANT_OWNER', 'ADMIN'), getOrder);
orderRouter.patch('/:id/status', requireAuth, requireRole('RESTAURANT_OWNER', 'ADMIN'), updateOrderStatus);