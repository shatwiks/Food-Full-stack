/**
 * useOrderWebSocket
 *
 * Maintains a persistent, authenticated WebSocket connection to the backend.
 * - Sends AUTH message immediately after connection opens.
 * - Calls `onEvent` for ORDER_STATUS_UPDATED and ORDER_CREATED messages.
 * - Auto-reconnects with capped exponential back-off on close/error.
 * - Cleans up on unmount.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../store/authstore';
import type { Order } from '../types';

export type WsOrderEventType = 'ORDER_STATUS_UPDATED' | 'ORDER_CREATED';

export interface WsOrderEvent {
  type: WsOrderEventType;
  data: Order;
}

const WS_URL = (() => {
  const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
  // Derive WS URL from the API base URL (http → ws, https → wss)
  if (apiUrl) {
    return apiUrl.replace(/^http/, 'ws').replace(/\/api$/, '') + '/ws';
  }
  return 'ws://localhost:3001/ws';
})();

const MIN_DELAY_MS = 1_000;
const MAX_DELAY_MS = 30_000;

export function useOrderWebSocket(
  onEvent: (event: WsOrderEvent) => void,
  enabled = true,
): { isConnected: boolean } {
  const { accessToken } = useAuthStore();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectDelay = useRef(MIN_DELAY_MS);
  const isConnectedRef = useRef(false);
  const onEventRef = useRef(onEvent);
  const unmountedRef = useRef(false);

  // Keep callback ref current without re-triggering the effect
  useEffect(() => {
    onEventRef.current = onEvent;
  });

  const connect = useCallback(() => {
    if (unmountedRef.current) return;
    if (!accessToken || !enabled) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectDelay.current = MIN_DELAY_MS; // reset back-off on success
      isConnectedRef.current = true;
      ws.send(JSON.stringify({ type: 'AUTH', token: accessToken }));
    };

    ws.onmessage = (evt) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(evt.data as string);
      } catch {
        return;
      }

      const type = msg.type as string;
      if (type === 'ORDER_STATUS_UPDATED' || type === 'ORDER_CREATED') {
        onEventRef.current({
          type: type as WsOrderEventType,
          data: msg.data as Order,
        });
      }
      // PING / AUTHENTICATED / ERROR — no action needed from UI
    };

    ws.onerror = () => {
      // onclose will handle reconnect
    };

    ws.onclose = () => {
      isConnectedRef.current = false;
      wsRef.current = null;
      if (unmountedRef.current || !enabled) return;

      // Exponential back-off reconnect
      const delay = reconnectDelay.current;
      reconnectDelay.current = Math.min(delay * 2, MAX_DELAY_MS);
      setTimeout(connect, delay);
    };
  }, [accessToken, enabled]);

  useEffect(() => {
    unmountedRef.current = false;
    connect();

    return () => {
      unmountedRef.current = true;
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect on intentional close
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return { isConnected: isConnectedRef.current };
}
