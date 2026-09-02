import 'dotenv/config';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

const unique = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

describe('2FA Authentication & Security Integration Tests', () => {
  const testEmail = `${unique('user2fa')}@example.com`;
  const testPassword = 'SecurePassword123!';
  let userId: string;
  let preAuthToken: string;

  beforeAll(async () => {
    // Register test user
    const res = await request(app).post('/api/auth/register').send({
      email: testEmail,
      password: testPassword,
      firstName: 'TwoFactor',
      lastName: 'Tester',
      role: 'CUSTOMER',
    });

    if (res.status === 201) {
      userId = res.body.user.id;
    }
  });

  afterAll(async () => {
    if (userId) {
      await prisma.otp.deleteMany({ where: { userId } });
      await prisma.refreshToken.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }
    await prisma.$disconnect();
  });

  it('login step validates password and issues preAuthToken requiring 2FA', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: testEmail,
      password: testPassword,
    });

    expect(res.status).toBe(200);
    expect(res.body.requires2FA).toBe(true);
    expect(res.body.preAuthToken).toBeDefined();
    preAuthToken = res.body.preAuthToken;

    // Verify OTP record exists in DB
    const otp = await prisma.otp.findFirst({
      where: { userId, type: 'LOGIN_2FA' },
    });
    expect(otp).not.toBeNull();
    expect(otp?.attempts).toBe(0);
  });

  it('verify-2fa fails and increments attempt counter on invalid code', async () => {
    const res = await request(app).post('/api/auth/verify-2fa').send({
      preAuthToken,
      code: '000000',
    });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
    expect(res.body.message).toMatch(/attempt/i);

    const otp = await prisma.otp.findFirst({
      where: { userId, type: 'LOGIN_2FA' },
    });
    expect(otp?.attempts).toBe(1);
  });

  it('verify-2fa burns OTP on 3 consecutive failed attempts (429 Rate Limit)', async () => {
    // Attempt 2
    await request(app).post('/api/auth/verify-2fa').send({
      preAuthToken,
      code: '000000',
    });

    // Attempt 3 (exhausts limit)
    const res3 = await request(app).post('/api/auth/verify-2fa').send({
      preAuthToken,
      code: '000000',
    });

    expect(res3.status).toBe(429);
    expect(res3.body.message).toMatch(/maximum attempts/i);

    // Verify OTP was burned
    const otp = await prisma.otp.findFirst({
      where: { userId, type: 'LOGIN_2FA' },
    });
    expect(otp).toBeNull();
  });

  it('resend-2fa enforces 60-second cooldown', async () => {
    // Re-login to get fresh preAuthToken and OTP
    const loginRes = await request(app).post('/api/auth/login').send({
      email: testEmail,
      password: testPassword,
    });
    expect(loginRes.status).toBe(200);
    const freshPreAuth = loginRes.body.preAuthToken;

    // Immediate resend should be rate-limited with 429
    const resendRes = await request(app).post('/api/auth/resend-2fa').send({
      preAuthToken: freshPreAuth,
    });

    expect(resendRes.status).toBe(429);
    expect(resendRes.body.message).toMatch(/wait/i);
  });
});
