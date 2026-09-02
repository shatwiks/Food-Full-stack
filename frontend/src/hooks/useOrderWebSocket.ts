/**
 * useOrderWebSocket
 *
 * Socket.IO client hook providing authenticated, room-based real-time order updates.
 * Supports:
 * - order:new (incoming restaurant order)
 * - order:status_updated (real-time status progression)
 * - Room scoping via join:order and join:restaurant
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import type { Order } from '../types';

export type WsOrderEventType = 'ORDER_STATUS_UPDATED' | 'ORDER_CREATED';

export interface WsOrderEvent {
  type: WsOrderEventType;
  data: Order;
}

const SOCKET_SERVER_URL = (() => {
  const apiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim().replace(/\/+$/, '');
  if (apiUrl) {
    return apiUrl.replace(/\/api$/, '');
  }
  return 'http://localhost:3001';
})();

export function useOrderWebSocket(
  onEvent?: (event: WsOrderEvent) => void,
  enabled = true
): {
  isConnected: boolean;
  joinOrder: (orderId: string) => void;
  leaveOrder: (orderId: string) => void;
  joinRestaurant: (restaurantId: string) => void;
  leaveRestaurant: (restaurantId: string) => void;
} {
  const { accessToken } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!enabled || !accessToken) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    const socket: Socket = io(SOCKET_SERVER_URL, {
      auth: {
        token: accessToken,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket.IO] Connection error:', err.message);
      setIsConnected(false);
    });

    // Listen for status updates
    socket.on('order:status_updated', (payload: { orderId: string; status: string; order?: Order }) => {
      if (onEventRef.current) {
        const orderData = payload.order || ({ id: payload.orderId, status: payload.status } as Order);
        onEventRef.current({
          type: 'ORDER_STATUS_UPDATED',
          data: orderData,
        });
      }
    });

    // Listen for new orders
    socket.on('order:new', (newOrder: Order) => {
      if (onEventRef.current) {
        onEventRef.current({
          type: 'ORDER_CREATED',
          data: newOrder,
        });
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [enabled, accessToken]);

  const joinOrder = useCallback((orderId: string) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('join:order', { orderId });
    }
  }, []);

  const leaveOrder = useCallback((orderId: string) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('leave:order', { orderId });
    }
  }, []);

  const joinRestaurant = useCallback((restaurantId: string) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('join:restaurant', { restaurantId });
    }
  }, []);

  const leaveRestaurant = useCallback((restaurantId: string) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('leave:restaurant', { restaurantId });
    }
  }, []);

  return {
    isConnected,
    joinOrder,
    leaveOrder,
    joinRestaurant,
    leaveRestaurant,
  };
}
