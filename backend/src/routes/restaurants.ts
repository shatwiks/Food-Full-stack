import { Router } from 'express';
import { createRestaurant, deleteRestaurant, getRestaurant, listRestaurants, updateRestaurant } from '../controllers/restaurantController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const restaurantRouter = Router();
restaurantRouter.get('/', listRestaurants);
restaurantRouter.get('/:id', getRestaurant);
restaurantRouter.post('/', requireAuth, requireRole('RESTAURANT_OWNER', 'ADMIN'), createRestaurant);
restaurantRouter.patch('/:id', requireAuth, requireRole('RESTAURANT_OWNER', 'ADMIN'), updateRestaurant);
restaurantRouter.delete('/:id', requireAuth, requireRole('RESTAURANT_OWNER', 'ADMIN'), deleteRestaurant);