import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authstore';
import { useToastStore } from '../store/toastStore';
import { useOrderWebSocket } from '../hooks/useOrderWebSocket';
import type { Order, OrderStatus } from '../types';

interface OrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const statusLabel: Record<OrderStatus, string> = {
  PENDING: '⏳ Pending Confirmation',
  CONFIRMED: '📋 Order Confirmed',
  PREPARING: '🍳 Cooking in Kitchen',
  OUT_FOR_DELIVERY: '🛵 Out for Delivery',
  DELIVERED: '✅ Delivered',
  CANCELLED: '❌ Cancelled',
};

const statusClass: Record<OrderStatus, string> = {
  PENDING: 'status-pending',
  CONFIRMED: 'status-confirmed',
  PREPARING: 'status-preparing',
  OUT_FOR_DELIVERY: 'status-delivery',
  DELIVERED: 'status-delivered',
  CANCELLED: 'status-cancelled',
};

const getStatusBadge = (status: OrderStatus) => (
  <span className={`status-pill ${statusClass[status] ?? ''}`}>
    {statusLabel[status] ?? status}
  </span>
);

export default function OrdersModal({ isOpen, onClose }: OrdersModalProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const { addToast } = useToastStore();
  const { user } = useAuthStore();

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/orders');
      setOrders(res.data.data || []);
    } catch {
      addToast('Failed to load orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      void loadOrders();
    }
  }, [isOpen]);

  // WebSocket handler — real-time order status updates
  const handleWsEvent = useCallback(
    (event: { type: string; data: Order }) => {
      if (!user) return;

      if (event.type === 'ORDER_STATUS_UPDATED') {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === event.data.id ? { ...o, status: event.data.status } : o
          )
        );
        // Only toast if this modal is open
        if (isOpen) {
          addToast(
            `Order #${event.data.id.slice(-6).toUpperCase()} → ${event.data.status.replace(/_/g, ' ')}`,
            'info'
          );
        }
      }
    },
    [user, isOpen, addToast]
  );

  // Mount WS only when logged in as CUSTOMER (or ADMIN)
  const wsEnabled = !!user && (user.role === 'CUSTOMER' || user.role === 'ADMIN');
  useOrderWebSocket(handleWsEvent, wsEnabled);

  // Track WS connection state for the live badge
  useEffect(() => {
    if (!wsEnabled) { setWsConnected(false); return; }
    // Optimistically mark as connected after a brief moment;
    // the hook will re-connect if it drops, giving visual feedback.
    const t = setTimeout(() => setWsConnected(true), 1200);
    return () => clearTimeout(t);
  }, [wsEnabled]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">My Orders</h2>
            <p className="modal-subtitle">Track live status and order history</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {wsEnabled && (
              <span className={`ws-live-badge ${wsConnected ? 'connected' : 'connecting'}`}>
                <span className="ws-live-dot" />
                {wsConnected ? 'Live' : 'Connecting…'}
              </span>
            )}
            <button
              type="button"
              className="btn btn-sm btn-outline-forest"
              onClick={loadOrders}
              disabled={loading}
            >
              🔄 Refresh
            </button>
            <button
              type="button"
              className="modal-close-btn"
              onClick={onClose}
              aria-label="Close orders"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="modal-body orders-container">
          {loading ? (
            <div className="modal-loader">
              <div className="spinner"></div>
              <p>Fetching your orders…</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📦</div>
              <h3>No orders yet</h3>
              <p>When you place orders, you can track their live progress right here.</p>
            </div>
          ) : (
            <div className="orders-list">
              {orders.map((order) => (
                <div key={order.id} className="order-card">
                  <div className="order-card-header">
                    <div>
                      <span className="order-id">Order #{order.id.slice(-6).toUpperCase()}</span>
                      <span className="order-time">
                        {new Date(order.createdAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>

                  {order.restaurant && (
                    <div className="order-restaurant-info">
                      <strong>🏪 {order.restaurant.name}</strong>
                      {order.deliveryAddress && (
                        <span className="order-address"> · 📍 {order.deliveryAddress}</span>
                      )}
                    </div>
                  )}

                  <div className="order-items-table">
                    {order.items.map((item) => (
                      <div key={item.id} className="order-item-detail">
                        <span className="order-item-qty">{item.quantity}x</span>
                        <span className="order-item-name">
                          {item.menuItem?.name || `Item (${item.menuItemId.slice(-4)})`}
                        </span>
                        <span className="order-item-subtotal">
                          ${(Number(item.unitPrice) * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="order-card-footer">
                    <span className="order-total-label">Total Amount</span>
                    <span className="order-total-value">${Number(order.totalAmount).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
