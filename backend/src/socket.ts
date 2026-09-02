import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from './lib/prisma.js';

interface SocketUser {
  id: string;
  email: string;
  role: string;
}

interface AuthJwtPayload {
  sub: string;
  email: string;
  role: string;
}

let io: Server | null = null;

export const initSocketServer = (httpServer: HttpServer): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // JWT Authentication Middleware
  io.use((socket: Socket, next) => {
    let token = socket.handshake.auth?.token as string | undefined;

    if (!token && socket.handshake.headers.authorization) {
      const parts = socket.handshake.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }

    if (!token) {
      return next(new Error('Authentication required: Missing auth token.'));
    }

    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
      return next(new Error('Server configuration error: JWT_ACCESS_SECRET missing.'));
    }

    try {
      const decoded = jwt.verify(token, secret) as AuthJwtPayload;
      socket.data.user = {
        id: decoded.sub,
        email: decoded.email,
        role: decoded.role,
      } as SocketUser;
      next();
    } catch {
      return next(new Error('Invalid or expired authentication token.'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as SocketUser | undefined;
    if (!user) {
      socket.disconnect(true);
      return;
    }

    // Join order room with ownership verification
    socket.on('join:order', async (payload: { orderId: string }) => {
      const { orderId } = payload || {};
      if (!orderId || typeof orderId !== 'string') return;

      try {
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          include: { restaurant: { select: { ownerId: true } } },
        });

        if (!order) return;

        const isOwner = order.restaurant?.ownerId === user.id;
        const isCustomer = order.userId === user.id;
        const isAdmin = user.role === 'ADMIN';

        if (isCustomer || isOwner || isAdmin) {
          socket.join(`order:${orderId}`);
        }
      } catch (err) {
        console.error(`Socket join:order error for ${orderId}:`, err);
      }
    });

    socket.on('leave:order', (payload: { orderId: string }) => {
      if (payload?.orderId) {
        socket.leave(`order:${payload.orderId}`);
      }
    });

    // Join restaurant room (Owner / Admin monitoring)
    socket.on('join:restaurant', async (payload: { restaurantId: string }) => {
      const { restaurantId } = payload || {};
      if (!restaurantId || typeof restaurantId !== 'string') return;

      try {
        const restaurant = await prisma.restaurant.findUnique({
          where: { id: restaurantId },
          select: { id: true, ownerId: true },
        });

        if (!restaurant) return;

        const isOwner = restaurant.ownerId === user.id;
        const isAdmin = user.role === 'ADMIN';

        if (isOwner || isAdmin) {
          socket.join(`restaurant:${restaurantId}`);
        }
      } catch (err) {
        console.error(`Socket join:restaurant error for ${restaurantId}:`, err);
      }
    });

    socket.on('leave:restaurant', (payload: { restaurantId: string }) => {
      if (payload?.restaurantId) {
        socket.leave(`restaurant:${payload.restaurantId}`);
      }
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error('Socket.IO has not been initialized. Call initSocketServer first.');
  }
  return io;
};
