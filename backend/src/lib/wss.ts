/**
 * wss.ts — WebSocket server singleton for OrderFlow.
 *
 * Message protocol (all JSON):
 *   Client → Server:  { type: 'AUTH', token: string }
 *   Server → Client:  { type: 'AUTHENTICATED', userId, role }
 *                     { type: 'ORDER_STATUS_UPDATED', data: Order }
 *                     { type: 'ORDER_CREATED', data: Order }
 *                     { type: 'PING' }
 *                     { type: 'ERROR', message: string }
 *
 * Access control:
 *   - ORDER_CREATED        → restaurant owner whose restaurant received the order
 *   - ORDER_STATUS_UPDATED → the customer who owns it + the restaurant owner
 */

import jwt from 'jsonwebtoken';
import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';

// ── Types ──────────────────────────────────────────────────────────────────

interface AuthPayload {
  sub: string;
  role: string;
  email: string;
}

interface AuthenticatedSocket extends WebSocket {
  userId?: string;
  role?: string;
  isAlive?: boolean;
}

export type WsEventType = 'ORDER_STATUS_UPDATED' | 'ORDER_CREATED';

export interface WsOrderPayload {
  id: string;
  userId: string;           // customer id
  restaurantId: string;
  restaurant?: { ownerId: string } | null;
  status: string;
  totalAmount: string | number;
  deliveryAddress?: string | null;
  createdAt: string;
  updatedAt: string;
  items: unknown[];
}

// ── Singleton state ────────────────────────────────────────────────────────

let wss: WebSocketServer | null = null;

// ── Helpers ────────────────────────────────────────────────────────────────

function send(socket: AuthenticatedSocket, payload: object): void {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

// ── Init ───────────────────────────────────────────────────────────────────

export function initWss(server: WebSocketServer): void {
  wss = server;

  wss.on('connection', (rawSocket: WebSocket, _req: IncomingMessage) => {
    const socket = rawSocket as AuthenticatedSocket;
    socket.isAlive = true;

    // Close unauthenticated connections after 5 s
    const authTimeout = setTimeout(() => {
      if (!socket.userId) {
        socket.terminate();
      }
    }, 5000);

    socket.on('pong', () => {
      socket.isAlive = true;
    });

    socket.on('message', (raw) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        send(socket, { type: 'ERROR', message: 'Invalid JSON message.' });
        return;
      }

      if (msg.type === 'AUTH') {
        const token = msg.token as string | undefined;
        if (!token) {
          send(socket, { type: 'ERROR', message: 'AUTH requires a token field.' });
          return;
        }

        const secret = process.env.JWT_ACCESS_SECRET;
        if (!secret) {
          send(socket, { type: 'ERROR', message: 'Server misconfiguration.' });
          return;
        }

        try {
          const payload = jwt.verify(token, secret) as AuthPayload;
          socket.userId = payload.sub;
          socket.role = payload.role;
          clearTimeout(authTimeout);
          send(socket, { type: 'AUTHENTICATED', userId: payload.sub, role: payload.role });
        } catch {
          send(socket, { type: 'ERROR', message: 'Invalid or expired token.' });
          socket.terminate();
        }
        return;
      }

      // All other message types require auth
      if (!socket.userId) {
        send(socket, { type: 'ERROR', message: 'Not authenticated.' });
      }
    });

    socket.on('error', () => {
      // suppress — connection will close naturally
    });

    socket.on('close', () => {
      clearTimeout(authTimeout);
    });
  });

  // Heartbeat — ping all clients every 30 s and terminate stale ones
  const heartbeat = setInterval(() => {
    if (!wss) return;
    wss.clients.forEach((rawSocket) => {
      const socket = rawSocket as AuthenticatedSocket;
      if (socket.isAlive === false) {
        socket.terminate();
        return;
      }
      socket.isAlive = false;
      socket.ping();
    });
  }, 30_000);

  wss.on('close', () => clearInterval(heartbeat));
}

// ── Fan-out ────────────────────────────────────────────────────────────────

/**
 * Notify relevant sockets when an order event occurs.
 *
 * ORDER_CREATED:        restaurant owner only
 * ORDER_STATUS_UPDATED: customer + restaurant owner
 */
export function notifyOrder(type: WsEventType, order: WsOrderPayload): void {
  if (!wss) return;

  const customerId = order.userId;
  const ownerId = order.restaurant?.ownerId;

  const targetUserIds = new Set<string>();
  if (type === 'ORDER_STATUS_UPDATED') {
    targetUserIds.add(customerId);
  }
  if (ownerId) {
    targetUserIds.add(ownerId);
  }

  const payload = JSON.stringify({ type, data: order });

  wss.clients.forEach((rawSocket) => {
    const socket = rawSocket as AuthenticatedSocket;
    if (
      socket.readyState === WebSocket.OPEN &&
      socket.userId &&
      targetUserIds.has(socket.userId)
    ) {
      socket.send(payload);
    }
  });
}
