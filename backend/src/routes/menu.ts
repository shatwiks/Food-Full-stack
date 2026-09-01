import { Router } from 'express';
import { createMenuItem, deleteMenuItem, listMenu, updateMenuItem } from '../controllers/menuController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const menuRouter = Router();
menuRouter.get('/restaurants/:id/menu', listMenu);
menuRouter.post('/restaurants/:id/menu', requireAuth, requireRole('RESTAURANT_OWNER', 'ADMIN'), createMenuItem);
menuRouter.patch('/menu-items/:id', requireAuth, requireRole('RESTAURANT_OWNER', 'ADMIN'), updateMenuItem);
menuRouter.delete('/menu-items/:id', requireAuth, requireRole('RESTAURANT_OWNER', 'ADMIN'), deleteMenuItem);