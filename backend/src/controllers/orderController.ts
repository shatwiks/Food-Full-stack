import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { parseId } from './restaurantController.js';
import { getIO } from '../socket.js';

const createSchema = z.object({ restaurantId: z.string().cuid(), deliveryAddress: z.string().trim().min(1).optional(), items: z.array(z.object({ menuItemId: z.string().cuid(), quantity: z.coerce.number().int().min(1).max(100), price: z.unknown().optional() })).min(1) });
const statusSchema = z.object({ status: z.enum(['PENDING', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED']) });
const include = { items: { include: { menuItem: true } }, restaurant: true } as const;

const accessibleOrder = async (id: string, user: NonNullable<Request['user']>) => {
  if (user.role === 'ADMIN') return prisma.order.findUnique({ where: { id }, include });
  if (user.role === 'CUSTOMER') return prisma.order.findFirst({ where: { id, userId: user.id }, include });
  return prisma.order.findFirst({ where: { id, restaurant: { ownerId: user.id } }, include });
};

export const createOrder = async (req: Request, res: Response) => {
  const parsed = createSchema.safeParse(req.body); if (!parsed.success) { res.status(400).json({ status: 'error', message: parsed.error.issues[0]?.message ?? 'Invalid order payload.' }); return; }
  const { restaurantId, deliveryAddress, items } = parsed.data;
  const menuItems = await prisma.menuItem.findMany({ where: { id: { in: items.map((item) => item.menuItemId) }, restaurantId, isAvailable: true } });
  if (menuItems.length !== items.length || new Set(items.map((item) => item.menuItemId)).size !== items.length) { res.status(400).json({ status: 'error', message: 'All menu items must exist, be available, and belong to the same restaurant.' }); return; }
  const byId = new Map(menuItems.map((item) => [item.id, item]));
  const orderItems = items.map((item) => { const menuItem = byId.get(item.menuItemId)!; return { menuItemId: item.menuItemId, quantity: item.quantity, unitPrice: menuItem.price }; });
  const totalAmount = orderItems.reduce((total, item) => total + Number(item.unitPrice) * item.quantity, 0).toFixed(2);
  const order = await prisma.order.create({ data: { userId: req.user!.id, restaurantId, deliveryAddress, totalAmount, items: { create: orderItems } }, include });

  try {
    const io = getIO();
    io.to(`restaurant:${restaurantId}`).emit('order:new', order);
  } catch (err) {
    console.error('Socket emit order:new error:', err);
  }

  res.status(201).json({ status: 'success', data: order });
};

export const listOrders = async (req: Request, res: Response) => {
  const orders = req.user!.role === 'ADMIN' ? await prisma.order.findMany({ include, orderBy: { createdAt: 'desc' } }) : req.user!.role === 'CUSTOMER' ? await prisma.order.findMany({ where: { userId: req.user!.id }, include, orderBy: { createdAt: 'desc' } }) : await prisma.order.findMany({ where: { restaurant: { ownerId: req.user!.id } }, include, orderBy: { createdAt: 'desc' } });
  res.json({ status: 'success', data: orders });
};

export const getOrder = async (req: Request, res: Response) => {
  const id = parseId(req.params.id, res); if (!id) return;
  const exists = await prisma.order.findUnique({ where: { id }, select: { id: true } }); if (!exists) { res.status(404).json({ status: 'error', message: 'Order not found.' }); return; }
  const order = await accessibleOrder(id, req.user!); if (!order) { res.status(403).json({ status: 'error', message: 'You do not have access to this order.' }); return; }
  res.json({ status: 'success', data: order });
};

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

export const updateOrderStatus = async (req: Request, res: Response) => {
  const id = parseId(req.params.id, res);
  if (!id) return;
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ status: 'error', message: parsed.error.issues[0]?.message ?? 'Invalid order status.' });
    return;
  }
  const order = await accessibleOrder(id, req.user!);
  if (!order) {
    const exists = await prisma.order.findUnique({ where: { id }, select: { id: true } });
    res.status(exists ? 403 : 404).json({ status: 'error', message: exists ? 'You do not manage this order.' : 'Order not found.' });
    return;
  }

  if (req.user!.role !== 'ADMIN') {
    const allowed = VALID_TRANSITIONS[order.status] || [];
    if (!allowed.includes(parsed.data.status)) {
      res.status(400).json({
        status: 'error',
        message: `Invalid status transition from ${order.status} to ${parsed.data.status}.`,
      });
      return;
    }
  }

  const updated = await prisma.order.update({ where: { id }, data: { status: parsed.data.status }, include });

  try {
    const io = getIO();
    const eventPayload = {
      orderId: order.id,
      status: parsed.data.status,
      updatedAt: updated.updatedAt,
      order: updated,
    };
    io.to(`order:${order.id}`).emit('order:status_updated', eventPayload);
    io.to(`restaurant:${order.restaurantId}`).emit('order:status_updated', eventPayload);
  } catch (err) {
    console.error('Socket emit order:status_updated error:', err);
  }

  res.json({ status: 'success', data: updated });
};