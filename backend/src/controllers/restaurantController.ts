import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

const idSchema = z.string().cuid();
export const pageSchema = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) });
const restaurantSchema = z.object({ name: z.string().trim().min(1), slug: z.string().trim().min(1).regex(/^[a-z0-9-]+$/), cuisine: z.string().trim().min(1).optional(), description: z.string().trim().optional(), address: z.string().trim().optional(), phone: z.string().trim().optional(), isActive: z.boolean().optional() });
const patchSchema = restaurantSchema.partial().refine((value) => Object.keys(value).length > 0, 'At least one field is required.');

export const parseId = (value: string | string[], res: Response): string | null => {
  if (Array.isArray(value)) { res.status(400).json({ status: 'error', message: 'Invalid resource id.' }); return null; }
  const result = idSchema.safeParse(value);
  if (!result.success) { res.status(400).json({ status: 'error', message: 'Invalid restaurant id.' }); return null; }
  return result.data;
};

export const listRestaurants = async (req: Request, res: Response) => {
  const parsed = pageSchema.extend({ search: z.string().trim().optional(), cuisine: z.string().trim().optional() }).safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ status: 'error', message: parsed.error.issues[0]?.message ?? 'Invalid pagination.' }); return; }
  const { page, limit, search, cuisine } = parsed.data;
  const where = { isActive: true, ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}), ...(cuisine ? { cuisine: { equals: cuisine, mode: 'insensitive' as const } } : {}) };
  const [restaurants, total] = await prisma.$transaction([prisma.restaurant.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { name: 'asc' } }), prisma.restaurant.count({ where })]);
  res.json({ status: 'success', data: restaurants, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
};

export const getRestaurant = async (req: Request, res: Response) => {
  const id = parseId(req.params.id, res); if (!id) return;
  const restaurant = await prisma.restaurant.findUnique({ where: { id }, include: { menuItems: { orderBy: { name: 'asc' } } } });
  if (!restaurant) { res.status(404).json({ status: 'error', message: 'Restaurant not found.' }); return; }
  res.json({ status: 'success', data: restaurant });
};

export const createRestaurant = async (req: Request, res: Response) => {
  const parsed = restaurantSchema.omit({ isActive: true }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ status: 'error', message: parsed.error.issues[0]?.message ?? 'Invalid restaurant payload.' }); return; }
  try { const restaurant = await prisma.restaurant.create({ data: { ...parsed.data, ownerId: req.user!.id } }); res.status(201).json({ status: 'success', data: restaurant }); }
  catch (error: any) { if (error.code === 'P2002') { res.status(409).json({ status: 'error', message: 'Restaurant slug already exists.' }); return; } throw error; }
};

export const ownedRestaurant = async (id: string, userId: string) => prisma.restaurant.findFirst({ where: { id, ownerId: userId } });

export const updateRestaurant = async (req: Request, res: Response) => {
  const id = parseId(req.params.id, res); if (!id) return;
  const parsed = patchSchema.safeParse(req.body); if (!parsed.success) { res.status(400).json({ status: 'error', message: parsed.error.issues[0]?.message ?? 'Invalid restaurant payload.' }); return; }
  const isAdmin = req.user!.role === 'ADMIN';
  const restaurant = isAdmin ? await prisma.restaurant.findUnique({ where: { id } }) : await ownedRestaurant(id, req.user!.id);
  if (!restaurant) { const exists = await prisma.restaurant.findUnique({ where: { id } }); res.status(exists ? 403 : 404).json({ status: 'error', message: exists ? 'You do not own this restaurant.' : 'Restaurant not found.' }); return; }
  try { res.json({ status: 'success', data: await prisma.restaurant.update({ where: { id }, data: parsed.data }) }); } catch (error: any) { if (error.code === 'P2002') { res.status(409).json({ status: 'error', message: 'Restaurant slug already exists.' }); return; } throw error; }
};

export const deleteRestaurant = async (req: Request, res: Response) => {
  const id = parseId(req.params.id, res); if (!id) return;
  const restaurant = await prisma.restaurant.findUnique({ where: { id } }); if (!restaurant) { res.status(404).json({ status: 'error', message: 'Restaurant not found.' }); return; }
  if (req.user!.role !== 'ADMIN' && restaurant.ownerId !== req.user!.id) { res.status(403).json({ status: 'error', message: 'You do not own this restaurant.' }); return; }
  try {
    await prisma.restaurant.delete({ where: { id } });
    res.status(204).send();
  } catch (error: any) {
    if (error.code === 'P2003' || error.code === 'P2014') {
      res.status(409).json({ status: 'error', message: 'Cannot delete restaurant with active or historical orders.' });
      return;
    }
    throw error;
  }
};