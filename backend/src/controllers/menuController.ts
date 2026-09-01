import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { ownedRestaurant, pageSchema, parseId } from './restaurantController.js';

const menuSchema = z.object({ name: z.string().trim().min(1), description: z.string().trim().optional(), price: z.coerce.number().positive().finite(), isAvailable: z.boolean().optional() });
const patchSchema = menuSchema.partial().refine((value) => Object.keys(value).length > 0, 'At least one field is required.');
const ownerMenuItem = async (id: string, userId: string) => prisma.menuItem.findFirst({ where: { id, restaurant: { ownerId: userId } } });

export const listMenu = async (req: Request, res: Response) => {
  const restaurantId = parseId(req.params.id, res); if (!restaurantId) return;
  const parsed = pageSchema.safeParse(req.query); if (!parsed.success) { res.status(400).json({ status: 'error', message: 'Invalid pagination.' }); return; }
  const { page, limit } = parsed.data;
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } }); if (!restaurant) { res.status(404).json({ status: 'error', message: 'Restaurant not found.' }); return; }
  const [data, total] = await prisma.$transaction([prisma.menuItem.findMany({ where: { restaurantId }, skip: (page - 1) * limit, take: limit, orderBy: { name: 'asc' } }), prisma.menuItem.count({ where: { restaurantId } })]);
  res.json({ status: 'success', data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
};

export const createMenuItem = async (req: Request, res: Response) => {
  const restaurantId = parseId(req.params.id, res); if (!restaurantId) return;
  const parsed = menuSchema.safeParse(req.body); if (!parsed.success) { res.status(400).json({ status: 'error', message: parsed.error.issues[0]?.message ?? 'Invalid menu item payload.' }); return; }
  const isAdmin = req.user!.role === 'ADMIN';
  const restaurant = isAdmin ? await prisma.restaurant.findUnique({ where: { id: restaurantId } }) : await ownedRestaurant(restaurantId, req.user!.id);
  if (!restaurant) { const exists = await prisma.restaurant.findUnique({ where: { id: restaurantId } }); res.status(exists ? 403 : 404).json({ status: 'error', message: exists ? 'You do not own this restaurant.' : 'Restaurant not found.' }); return; }
  const item = await prisma.menuItem.create({ data: { ...parsed.data, restaurantId, price: parsed.data.price } }); res.status(201).json({ status: 'success', data: item });
};

export const updateMenuItem = async (req: Request, res: Response) => {
  const id = parseId(req.params.id, res); if (!id) return;
  const parsed = patchSchema.safeParse(req.body); if (!parsed.success) { res.status(400).json({ status: 'error', message: parsed.error.issues[0]?.message ?? 'Invalid menu item payload.' }); return; }
  const isAdmin = req.user!.role === 'ADMIN';
  const item = isAdmin ? await prisma.menuItem.findUnique({ where: { id } }) : await ownerMenuItem(id, req.user!.id);
  if (!item) { const exists = await prisma.menuItem.findUnique({ where: { id } }); res.status(exists ? 403 : 404).json({ status: 'error', message: exists ? 'You do not own this menu item.' : 'Menu item not found.' }); return; }
  res.json({ status: 'success', data: await prisma.menuItem.update({ where: { id }, data: parsed.data }) });
};

export const deleteMenuItem = async (req: Request, res: Response) => {
  const id = parseId(req.params.id, res); if (!id) return;
  const isAdmin = req.user!.role === 'ADMIN';
  const item = isAdmin ? await prisma.menuItem.findUnique({ where: { id } }) : await ownerMenuItem(id, req.user!.id);
  if (!item) { const exists = await prisma.menuItem.findUnique({ where: { id } }); res.status(exists ? 403 : 404).json({ status: 'error', message: exists ? 'You do not own this menu item.' : 'Menu item not found.' }); return; }
  try {
    await prisma.menuItem.delete({ where: { id } });
    res.status(204).send();
  } catch (error: any) {
    if (error.code === 'P2003' || error.code === 'P2014') {
      res.status(409).json({ status: 'error', message: 'Cannot delete menu item associated with existing orders. You can set isAvailable to false instead.' });
      return;
    }
    throw error;
  }
};