import 'dotenv/config';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

const unique = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

type Session = { token: string; userId: string };

const register = async (role: 'CUSTOMER' | 'RESTAURANT_OWNER' | 'ADMIN'): Promise<Session> => {
  const response = await request(app).post('/api/auth/register').send({ email: `${unique(role.toLowerCase())}@example.com`, password: 'TestPassword123!', role });
  expect(response.status).toBe(201);
  return { token: response.body.tokens.accessToken, userId: response.body.user.id };
};

const auth = (session: Session) => ({ Authorization: `Bearer ${session.token}` });

describe('core REST API integration', () => {
  let customer: Session;
  let ownerA: Session;
  let ownerB: Session;
  let admin: Session;
  let restaurantA: any;
  let restaurantB: any;
  let menuA: any;
  let menuB: any;
  let order: any;

  beforeAll(async () => {
    customer = await register('CUSTOMER');
    ownerA = await register('RESTAURANT_OWNER');
    ownerB = await register('RESTAURANT_OWNER');
    admin = await register('ADMIN');

    restaurantA = (await request(app).post('/api/restaurants').set(auth(ownerA)).send({ name: 'Alpha Kitchen', slug: unique('alpha'), cuisine: 'Italian' })).body.data;
    restaurantB = (await request(app).post('/api/restaurants').set(auth(ownerB)).send({ name: 'Beta Grill', slug: unique('beta'), cuisine: 'Mexican' })).body.data;
    menuA = (await request(app).post(`/api/restaurants/${restaurantA.id}/menu`).set(auth(ownerA)).send({ name: 'Pasta', price: 12.5 })).body.data;
    menuB = (await request(app).post(`/api/restaurants/${restaurantB.id}/menu`).set(auth(ownerB)).send({ name: 'Taco', price: 8 })).body.data;
    order = (await request(app).post('/api/orders').set(auth(customer)).send({ restaurantId: restaurantB.id, items: [{ menuItemId: menuB.id, quantity: 2, price: 9999 }] })).body.data;
  });

  afterAll(async () => {
    await prisma.orderItem.deleteMany({ where: { order: { userId: { in: [customer.userId, ownerA.userId, ownerB.userId, admin.userId] } } } });
    await prisma.order.deleteMany({ where: { userId: { in: [customer.userId, ownerA.userId, ownerB.userId, admin.userId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [customer.userId, ownerA.userId, ownerB.userId, admin.userId] } } });
    await prisma.$disconnect();
  });

  it('lists restaurants publicly with pagination, search, and cuisine filter', async () => {
    const response = await request(app).get('/api/restaurants?page=1&limit=1&search=Alpha&cuisine=Italian');
    expect(response.status).toBe(200);
    expect(response.body.data[0].name).toBe('Alpha Kitchen');
    expect(response.body.pagination.limit).toBe(1);
  });

  it('rejects invalid restaurant query parameters', async () => {
    const response = await request(app).get('/api/restaurants?page=0');
    expect(response.status).toBe(400);
  });

  it('gets a restaurant with menu items', async () => {
    const response = await request(app).get(`/api/restaurants/${restaurantA.id}`);
    expect(response.status).toBe(200);
    expect(response.body.data.menuItems[0].name).toBe('Pasta');
  });

  it('creates, updates, and deletes restaurants with ownership enforcement', async () => {
    const invalid = await request(app).post('/api/restaurants').set(auth(ownerA)).send({ name: '', slug: 'bad' });
    expect(invalid.status).toBe(400);
    const forbidden = await request(app).patch(`/api/restaurants/${restaurantB.id}`).set(auth(ownerA)).send({ name: 'Nope' });
    expect(forbidden.status).toBe(403);
    const updated = await request(app).patch(`/api/restaurants/${restaurantA.id}`).set(auth(ownerA)).send({ description: 'Updated' });
    expect(updated.status).toBe(200);
    const temporary = (await request(app).post('/api/restaurants').set(auth(ownerA)).send({ name: 'Temporary', slug: unique('temporary') })).body.data;
    const deleted = await request(app).delete(`/api/restaurants/${temporary.id}`).set(auth(admin));
    expect(deleted.status).toBe(204);
  });

  it('lists menu items publicly and rejects invalid pagination', async () => {
    const response = await request(app).get(`/api/restaurants/${restaurantB.id}/menu?page=1&limit=10`);
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect((await request(app).get(`/api/restaurants/${restaurantB.id}/menu?page=nope`)).status).toBe(400);
  });

  it('enforces menu ownership and validates menu payloads', async () => {
    expect((await request(app).post(`/api/restaurants/${restaurantB.id}/menu`).set(auth(ownerA)).send({ name: 'Hack', price: 1 })).status).toBe(403);
    expect((await request(app).patch(`/api/menu-items/${menuB.id}`).set(auth(ownerA)).send({ price: -1 })).status).toBe(400);
    expect((await request(app).patch(`/api/menu-items/${menuB.id}`).set(auth(ownerA)).send({ name: 'Hack' })).status).toBe(403);
    expect((await request(app).patch(`/api/menu-items/${menuB.id}`).set(auth(ownerB)).send({ name: 'Updated Taco' })).status).toBe(200);
    expect((await request(app).delete(`/api/menu-items/${menuA.id}`).set(auth(ownerA)).send()).status).toBe(204);
  });

  it('creates orders with server-side prices and rejects invalid items', async () => {
    expect(Number(order.totalAmount)).toBe(16);
    expect(order.items[0].unitPrice).toBe('8');
    expect((await request(app).post('/api/orders').set(auth(customer)).send({ restaurantId: restaurantB.id, items: [] })).status).toBe(400);
    expect((await request(app).post('/api/orders').set(auth(customer)).send({ restaurantId: restaurantB.id, items: [{ menuItemId: unique('missing'), quantity: 1 }] })).status).toBe(400);
    expect((await request(app).post('/api/orders').set(auth(ownerA)).send({ restaurantId: restaurantB.id, items: [{ menuItemId: menuB.id, quantity: 1 }] })).status).toBe(403);
  });

  it('scopes order lists and blocks cross-owner access', async () => {
    expect((await request(app).get('/api/orders').set(auth(customer))).body.data).toHaveLength(1);
    expect((await request(app).get('/api/orders').set(auth(ownerA))).body.data).toHaveLength(0);
    expect((await request(app).get('/api/orders').set(auth(ownerB))).body.data).toHaveLength(1);
    expect((await request(app).get('/api/orders').set(auth(admin))).body.data.length).toBeGreaterThanOrEqual(1);
    expect((await request(app).get(`/api/orders/${order.id}`).set(auth(ownerA))).status).toBe(403);
    expect((await request(app).get(`/api/orders/${order.id}`).set(auth(customer))).status).toBe(200);
  });

  it('updates order status only for the restaurant owner or admin', async () => {
    expect((await request(app).patch(`/api/orders/${order.id}/status`).set(auth(ownerA)).send({ status: 'CONFIRMED' })).status).toBe(403);
    expect((await request(app).patch(`/api/orders/${order.id}/status`).set(auth(ownerB)).send({ status: 'BAD' })).status).toBe(400);
    expect((await request(app).patch(`/api/orders/${order.id}/status`).set(auth(ownerB)).send({ status: 'CONFIRMED' })).status).toBe(200);
    expect((await request(app).patch(`/api/orders/${order.id}/status`).set(auth(admin)).send({ status: 'PREPARING' })).status).toBe(200);
  });

  it('returns correct unauthenticated and not-found responses', async () => {
    expect((await request(app).post('/api/restaurants').send({ name: 'No auth', slug: 'no-auth' })).status).toBe(401);
    expect((await request(app).get('/api/restaurants/not-a-cuid')).status).toBe(400);
    expect((await request(app).get('/api/restaurants/c000000000000000000000000')).status).toBe(404);
  });
});
