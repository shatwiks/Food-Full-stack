import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { useOrderWebSocket } from '../hooks/useOrderWebSocket';
import type { MenuItem, Order, OrderStatus, Restaurant } from '../types';

interface OwnerDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshData: () => void;
}

type TabType = 'orders' | 'menu' | 'restaurants';
type OrderFilterType = 'ALL' | 'PENDING' | 'IN_PROGRESS' | 'OUT_FOR_DELIVERY' | 'COMPLETED';

export default function OwnerDashboardModal({
  isOpen,
  onClose,
  onRefreshData,
}: OwnerDashboardModalProps) {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();

  const [activeTab, setActiveTab] = useState<TabType>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);

  // Filter & Search states
  const [orderFilter, setOrderFilter] = useState<OrderFilterType>('ALL');
  const [orderSearch, setOrderSearch] = useState('');
  const [menuSearch, setMenuSearch] = useState('');

  // New Restaurant Form State
  const [restForm, setRestForm] = useState({
    name: '',
    slug: '',
    cuisine: '',
    description: '',
    address: '',
    phone: '',
  });

  // Editing Restaurant State
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);

  // New Menu Item Form State
  const [itemForm, setItemForm] = useState({
    name: '',
    description: '',
    price: '',
    isAvailable: true,
  });

  // Editing Menu Item State
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);
  const [editItemForm, setEditItemForm] = useState({
    name: '',
    description: '',
    price: '',
    isAvailable: true,
  });

  useEffect(() => {
    if (isOpen) {
      void loadInitialData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedRestaurantId) {
      void loadMenuItems(selectedRestaurantId);
    }
  }, [selectedRestaurantId]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [ordersRes, restRes] = await Promise.all([
        apiClient.get('/orders'),
        apiClient.get('/restaurants?limit=50'),
      ]);

      setOrders(ordersRes.data.data || []);
      const restList = restRes.data.data || [];
      setRestaurants(restList);
      if (restList.length > 0 && !selectedRestaurantId) {
        setSelectedRestaurantId(restList[0].id);
      }
    } catch (err: any) {
      addToast('Failed to load dashboard data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadMenuItems = async (restaurantId: string) => {
    try {
      const res = await apiClient.get(`/restaurants/${restaurantId}/menu?limit=50`);
      setMenuItems(res.data.data || []);
    } catch (err) {
      // ignore
    }
  };

  // Order status transitions
  const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await apiClient.patch(`/orders/${orderId}/status`, { status: newStatus });
      addToast(`Order updated to ${newStatus}!`, 'success');
      setOrders((current) =>
        current.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to update order status.';
      addToast(msg, 'error');
    }
  };

  // Restaurant Actions
  const handleCreateRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restForm.name || !restForm.slug) {
      addToast('Name and Slug are required.', 'error');
      return;
    }

    try {
      const res = await apiClient.post('/restaurants', restForm);
      addToast(`Restaurant "${res.data.data.name}" created!`, 'success');
      setRestForm({ name: '', slug: '', cuisine: '', description: '', address: '', phone: '' });
      await loadInitialData();
      onRefreshData();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to create restaurant.';
      addToast(msg, 'error');
    }
  };

  const handleUpdateRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRestaurant) return;

    try {
      const res = await apiClient.patch(`/restaurants/${editingRestaurant.id}`, {
        name: editingRestaurant.name,
        cuisine: editingRestaurant.cuisine,
        address: editingRestaurant.address,
        phone: editingRestaurant.phone,
        description: editingRestaurant.description,
      });
      addToast(`Updated "${res.data.data.name}" details!`, 'success');
      setEditingRestaurant(null);
      await loadInitialData();
      onRefreshData();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to update restaurant.';
      addToast(msg, 'error');
    }
  };

  // Menu Actions
  const handleCreateMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRestaurantId) {
      addToast('Please select a restaurant first.', 'error');
      return;
    }
    if (!itemForm.name.trim() || !itemForm.price) {
      addToast('Name and Price are required.', 'error');
      return;
    }

    const numericPrice = parseFloat(itemForm.price);
    if (isNaN(numericPrice) || numericPrice <= 0) {
      addToast('Price must be a positive number greater than 0.00.', 'error');
      return;
    }

    try {
      await apiClient.post(`/restaurants/${selectedRestaurantId}/menu`, {
        name: itemForm.name.trim(),
        description: itemForm.description.trim() || undefined,
        price: Number(numericPrice.toFixed(2)),
        isAvailable: itemForm.isAvailable,
      });

      addToast(`Dish "${itemForm.name}" added to menu!`, 'success');
      setItemForm({ name: '', description: '', price: '', isAvailable: true });
      await loadMenuItems(selectedRestaurantId);
      onRefreshData();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to add dish.';
      addToast(msg, 'error');
    }
  };

  const startEditMenuItem = (item: MenuItem) => {
    setEditingMenuItem(item);
    setEditItemForm({
      name: item.name,
      description: item.description || '',
      price: String(item.price),
      isAvailable: item.isAvailable,
    });
  };

  const handleUpdateMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMenuItem) return;

    const numericPrice = parseFloat(editItemForm.price);
    if (isNaN(numericPrice) || numericPrice <= 0) {
      addToast('Price must be a positive number greater than 0.00.', 'error');
      return;
    }

    try {
      const res = await apiClient.patch(`/menu-items/${editingMenuItem.id}`, {
        name: editItemForm.name.trim(),
        description: editItemForm.description.trim() || undefined,
        price: Number(numericPrice.toFixed(2)),
        isAvailable: editItemForm.isAvailable,
      });

      addToast(`Updated dish "${res.data.data.name}"!`, 'success');
      setEditingMenuItem(null);
      await loadMenuItems(selectedRestaurantId);
      onRefreshData();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to update dish.';
      addToast(msg, 'error');
    }
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    try {
      await apiClient.patch(`/menu-items/${item.id}`, {
        isAvailable: !item.isAvailable,
      });
      addToast(`"${item.name}" is now ${!item.isAvailable ? 'In Stock' : 'Sold Out'}`, 'info');
      setMenuItems((current) =>
        current.map((i) => (i.id === item.id ? { ...i, isAvailable: !i.isAvailable } : i))
      );
      onRefreshData();
    } catch (err: any) {
      addToast('Failed to update dish availability', 'error');
    }
  };

  const handleDeleteMenuItem = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}" from the menu?`)) return;
    try {
      await apiClient.delete(`/menu-items/${id}`);
      addToast(`Dish "${name}" removed.`, 'success');
      setMenuItems((current) => current.filter((i) => i.id !== id));
      onRefreshData();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to delete dish.';
      addToast(msg, 'error');
    }
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const totalRevenue = orders
      .filter((o) => o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
    const pendingCount = orders.filter((o) => o.status === 'PENDING').length;
    const activeCount = orders.filter((o) =>
      ['CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY'].includes(o.status)
    ).length;
    const deliveredCount = orders.filter((o) => o.status === 'DELIVERED').length;

    return {
      totalRevenue,
      totalOrders: orders.length,
      pendingCount,
      activeCount,
      deliveredCount,
    };
  }, [orders]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Status Filter
      if (orderFilter === 'PENDING' && order.status !== 'PENDING') return false;
      if (
        orderFilter === 'IN_PROGRESS' &&
        !['CONFIRMED', 'PREPARING'].includes(order.status)
      )
        return false;
      if (
        orderFilter === 'OUT_FOR_DELIVERY' &&
        order.status !== 'OUT_FOR_DELIVERY'
      )
        return false;
      if (
        orderFilter === 'COMPLETED' &&
        !['DELIVERED', 'CANCELLED'].includes(order.status)
      )
        return false;

      // Search query
      if (orderSearch.trim()) {
        const query = orderSearch.toLowerCase();
        const matchesId = order.id.toLowerCase().includes(query);
        const matchesRest = order.restaurant?.name.toLowerCase().includes(query);
        const matchesAddr = order.deliveryAddress?.toLowerCase().includes(query);
        const matchesItem = order.items.some((i) =>
          i.menuItem?.name.toLowerCase().includes(query)
        );
        if (!matchesId && !matchesRest && !matchesAddr && !matchesItem) return false;
      }

      return true;
    });
  }, [orders, orderFilter, orderSearch]);

  // Filtered Menu Items
  const filteredMenuItems = useMemo(() => {
    if (!menuSearch.trim()) return menuItems;
    const query = menuSearch.toLowerCase();
    return menuItems.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
    );
  }, [menuItems, menuSearch]);

  // ── WebSocket real-time updates ──────────────────────────────────────────
  const handleWsEvent = useCallback(
    (event: { type: string; data: Order }) => {
      if (event.type === 'ORDER_CREATED') {
        setOrders((prev) => {
          // Avoid duplicates if REST response already added it
          if (prev.some((o) => o.id === event.data.id)) return prev;
          return [event.data, ...prev];
        });
        addToast(
          `🆕 New order from ${event.data.restaurant?.name ?? 'a customer'}!`,
          'info'
        );
      } else if (event.type === 'ORDER_STATUS_UPDATED') {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === event.data.id ? { ...o, status: event.data.status } : o
          )
        );
      }
    },
    [addToast]
  );

  const wsEnabled =
    !!user && (user.role === 'RESTAURANT_OWNER' || user.role === 'ADMIN') && isOpen;
  const { isConnected, joinRestaurant, leaveRestaurant } = useOrderWebSocket(handleWsEvent, wsEnabled);

  // Subscribe to restaurant rooms for real-time kitchen feed updates
  useEffect(() => {
    if (!isOpen || restaurants.length === 0) return;
    restaurants.forEach((r) => joinRestaurant(r.id));
    return () => {
      restaurants.forEach((r) => leaveRestaurant(r.id));
    };
  }, [isOpen, restaurants, joinRestaurant, leaveRestaurant]);
  // ────────────────────────────────────────────────────────────────────────

  if (!isOpen || !user || (user.role !== 'RESTAURANT_OWNER' && user.role !== 'ADMIN')) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content modal-xlarge" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 className="modal-title">
              {user?.role === 'ADMIN' ? '🛡️ Administrator Portal' : '👨‍🍳 Kitchen & Restaurant Hub'}
            </h2>
            <p className="modal-subtitle">
              Manage incoming customer orders, menu offerings, and kitchen details
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className={`ws-live-badge ${isConnected ? 'connected' : 'connecting'}`}>
              <span className="ws-live-dot" />
              {isConnected ? 'Live' : 'Connecting…'}
            </span>
            <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close dashboard">
              ✕
            </button>
          </div>
        </div>

        {/* Dashboard Top Metric KPIs */}
        <div className="dashboard-kpi-bar">
          <div className="kpi-card">
            <span className="kpi-label">Total Revenue</span>
            <span className="kpi-value">${stats.totalRevenue.toFixed(2)}</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-label">Total Orders</span>
            <span className="kpi-value">{stats.totalOrders}</span>
          </div>
          <div className="kpi-card kpi-pending">
            <span className="kpi-label">Action Required</span>
            <span className="kpi-value">{stats.pendingCount}</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-label">Active in Kitchen</span>
            <span className="kpi-value">{stats.activeCount}</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="dashboard-tabs">
          <button
            type="button"
            className={`d-tab ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            📋 Live Orders ({orders.length})
            {stats.pendingCount > 0 && <span className="tab-badge-alert">{stats.pendingCount}</span>}
          </button>
          <button
            type="button"
            className={`d-tab ${activeTab === 'menu' ? 'active' : ''}`}
            onClick={() => setActiveTab('menu')}
          >
            🍲 Dishes & Menu ({menuItems.length})
          </button>
          <button
            type="button"
            className={`d-tab ${activeTab === 'restaurants' ? 'active' : ''}`}
            onClick={() => setActiveTab('restaurants')}
          >
            🏪 Restaurants ({restaurants.length})
          </button>
        </div>

        {/* Body Content */}
        <div className="modal-body dashboard-body">
          {loading ? (
            <div className="modal-loader">
              <div className="spinner"></div>
              <p>Loading dashboard…</p>
            </div>
          ) : activeTab === 'orders' ? (
            /* TAB 1: ORDERS */
            <div className="tab-orders-content">
              {/* Filter and Search Bar */}
              <div className="dashboard-filter-toolbar">
                <div className="order-status-pills">
                  <button
                    type="button"
                    className={`filter-pill-btn ${orderFilter === 'ALL' ? 'active' : ''}`}
                    onClick={() => setOrderFilter('ALL')}
                  >
                    All ({orders.length})
                  </button>
                  <button
                    type="button"
                    className={`filter-pill-btn ${orderFilter === 'PENDING' ? 'active' : ''}`}
                    onClick={() => setOrderFilter('PENDING')}
                  >
                    ⏳ Action Needed ({stats.pendingCount})
                  </button>
                  <button
                    type="button"
                    className={`filter-pill-btn ${orderFilter === 'IN_PROGRESS' ? 'active' : ''}`}
                    onClick={() => setOrderFilter('IN_PROGRESS')}
                  >
                    🍳 In Kitchen ({stats.activeCount})
                  </button>
                  <button
                    type="button"
                    className={`filter-pill-btn ${orderFilter === 'OUT_FOR_DELIVERY' ? 'active' : ''}`}
                    onClick={() => setOrderFilter('OUT_FOR_DELIVERY')}
                  >
                    🛵 Out for Delivery
                  </button>
                  <button
                    type="button"
                    className={`filter-pill-btn ${orderFilter === 'COMPLETED' ? 'active' : ''}`}
                    onClick={() => setOrderFilter('COMPLETED')}
                  >
                    ✅ Completed / Closed
                  </button>
                </div>

                <div className="dashboard-search-wrap">
                  <input
                    type="text"
                    placeholder="Search by order #, address, dish..."
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    className="dash-search-input"
                  />
                  {orderSearch && (
                    <button
                      type="button"
                      className="search-clear-btn"
                      onClick={() => setOrderSearch('')}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {filteredOrders.length === 0 ? (
                <div className="empty-state">
                  <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📦</div>
                  <p>No orders match the selected filter criteria.</p>
                </div>
              ) : (
                <div className="dashboard-orders-grid">
                  {filteredOrders.map((order) => (
                    <div key={order.id} className="owner-order-card">
                      <div className="owner-order-top">
                        <div>
                          <span className="order-id">#{order.id.slice(-6).toUpperCase()}</span>
                          <h4 className="order-rest-title">{order.restaurant?.name || 'Restaurant'}</h4>
                          <span className="order-time">
                            {new Date(order.createdAt).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <span className={`status-pill status-${order.status.toLowerCase().replace('_', '')}`}>
                          {order.status.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <div className="owner-order-items">
                        {order.items.map((i) => (
                          <div key={i.id} className="item-line">
                            <span>
                              <strong>{i.quantity}x</strong> {i.menuItem?.name || 'Dish'}
                            </span>
                            <span>${(Number(i.unitPrice) * i.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="owner-order-address">
                        <strong>📍 Delivery:</strong> {order.deliveryAddress || 'Standard delivery address'}
                      </div>

                      <div className="owner-order-total">
                        <span>Total Paid</span>
                        <strong>${Number(order.totalAmount).toFixed(2)}</strong>
                      </div>

                      <div className="status-flow-actions">
                        {order.status === 'PENDING' && (
                          <>
                            <button
                              type="button"
                              className="btn btn-sm btn-primary"
                              onClick={() => handleUpdateOrderStatus(order.id, 'CONFIRMED')}
                            >
                              ✓ Accept Order
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleUpdateOrderStatus(order.id, 'CANCELLED')}
                            >
                              ✕ Reject
                            </button>
                          </>
                        )}

                        {order.status === 'CONFIRMED' && (
                          <button
                            type="button"
                            className="btn btn-sm btn-warning"
                            onClick={() => handleUpdateOrderStatus(order.id, 'PREPARING')}
                          >
                            🍳 Start Cooking
                          </button>
                        )}

                        {order.status === 'PREPARING' && (
                          <button
                            type="button"
                            className="btn btn-sm btn-info"
                            onClick={() => handleUpdateOrderStatus(order.id, 'OUT_FOR_DELIVERY')}
                          >
                            🛵 Dispatch Delivery
                          </button>
                        )}

                        {order.status === 'OUT_FOR_DELIVERY' && (
                          <button
                            type="button"
                            className="btn btn-sm btn-success"
                            onClick={() => handleUpdateOrderStatus(order.id, 'DELIVERED')}
                          >
                            ✅ Mark Delivered
                          </button>
                        )}

                        {(order.status === 'DELIVERED' || order.status === 'CANCELLED') && (
                          <span className="order-final-tag">
                            {order.status === 'DELIVERED' ? '✅ Order Delivered' : '🛑 Order Cancelled'}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeTab === 'menu' ? (
            /* TAB 2: MENU CRUD */
            <div className="tab-menu-content">
              <div className="restaurant-selector-bar">
                <label htmlFor="selectRest">Managing Menu for: </label>
                <select
                  id="selectRest"
                  value={selectedRestaurantId}
                  onChange={(e) => setSelectedRestaurantId(e.target.value)}
                  className="rest-select-input"
                >
                  {restaurants.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.cuisine || 'Kitchen'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="split-dashboard">
                {/* Add / Edit Dish Form */}
                <div className="dash-form-box">
                  <h3>{editingMenuItem ? `✏️ Edit Dish: ${editingMenuItem.name}` : '➕ Add New Dish'}</h3>
                  <form
                    onSubmit={editingMenuItem ? handleUpdateMenuItem : handleCreateMenuItem}
                    className="dash-form"
                  >
                    <div className="field">
                      <label htmlFor="dishName">Dish Name *</label>
                      <input
                        id="dishName"
                        value={editingMenuItem ? editItemForm.name : itemForm.name}
                        onChange={(e) =>
                          editingMenuItem
                            ? setEditItemForm({ ...editItemForm, name: e.target.value })
                            : setItemForm({ ...itemForm, name: e.target.value })
                        }
                        placeholder="e.g. Signature Truffle Pizza"
                        required
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="dishPrice">Price ($) *</label>
                      <input
                        id="dishPrice"
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={editingMenuItem ? editItemForm.price : itemForm.price}
                        onChange={(e) =>
                          editingMenuItem
                            ? setEditItemForm({ ...editItemForm, price: e.target.value })
                            : setItemForm({ ...itemForm, price: e.target.value })
                        }
                        placeholder="14.99"
                        required
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="dishDesc">Description</label>
                      <textarea
                        id="dishDesc"
                        rows={2}
                        value={editingMenuItem ? editItemForm.description : itemForm.description}
                        onChange={(e) =>
                          editingMenuItem
                            ? setEditItemForm({ ...editItemForm, description: e.target.value })
                            : setItemForm({ ...itemForm, description: e.target.value })
                        }
                        placeholder="Ingredients, dietary details, preparation..."
                      />
                    </div>
                    <div className="field-checkbox">
                      <label>
                        <input
                          type="checkbox"
                          checked={editingMenuItem ? editItemForm.isAvailable : itemForm.isAvailable}
                          onChange={(e) =>
                            editingMenuItem
                              ? setEditItemForm({ ...editItemForm, isAvailable: e.target.checked })
                              : setItemForm({ ...itemForm, isAvailable: e.target.checked })
                          }
                        />
                        <span>Available for ordering immediately</span>
                      </label>
                    </div>
                    <div className="form-action-buttons">
                      <button type="submit" className="btn btn-primary btn-block">
                        {editingMenuItem ? '💾 Save Changes' : '+ Add to Menu'}
                      </button>
                      {editingMenuItem && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-block"
                          onClick={() => setEditingMenuItem(null)}
                          style={{ marginTop: '8px' }}
                        >
                          Cancel Editing
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* Menu Items List */}
                <div className="dash-list-box">
                  <div className="list-box-header">
                    <h3>Dishes on Menu ({filteredMenuItems.length})</h3>
                    <input
                      type="text"
                      placeholder="Search menu items..."
                      value={menuSearch}
                      onChange={(e) => setMenuSearch(e.target.value)}
                      className="mini-search-input"
                    />
                  </div>

                  {filteredMenuItems.length === 0 ? (
                    <div className="empty-state">
                      <p>No dishes found. Add your first dish using the form.</p>
                    </div>
                  ) : (
                    <div className="menu-manage-list">
                      {filteredMenuItems.map((item) => (
                        <div key={item.id} className="menu-manage-item">
                          <div className="item-left">
                            <div className="item-name-row">
                              <strong>{item.name}</strong>
                              <span className="dish-price">${Number(item.price).toFixed(2)}</span>
                            </div>
                            {item.description && (
                              <p className="item-desc-small">{item.description}</p>
                            )}
                          </div>
                          <div className="item-actions-row">
                            <button
                              type="button"
                              className={`btn btn-sm ${item.isAvailable ? 'btn-outline-forest' : 'btn-warning'}`}
                              onClick={() => handleToggleAvailability(item)}
                              title="Toggle Availability"
                            >
                              {item.isAvailable ? '✓ In Stock' : '⚠️ Sold Out'}
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary"
                              onClick={() => startEditMenuItem(item)}
                              title="Edit Dish Details"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleDeleteMenuItem(item.id, item.name)}
                              title="Delete Dish"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* TAB 3: RESTAURANTS */
            <div className="tab-restaurants-content">
              <div className="split-dashboard">
                <div className="dash-form-box">
                  <h3>{editingRestaurant ? `✏️ Edit "${editingRestaurant.name}"` : '➕ Add New Restaurant'}</h3>
                  {editingRestaurant ? (
                    <form onSubmit={handleUpdateRestaurant} className="dash-form">
                      <div className="field">
                        <label htmlFor="editRestName">Restaurant Name *</label>
                        <input
                          id="editRestName"
                          value={editingRestaurant.name}
                          onChange={(e) => setEditingRestaurant({ ...editingRestaurant, name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="field">
                        <label htmlFor="editRestCuisine">Cuisine</label>
                        <input
                          id="editRestCuisine"
                          value={editingRestaurant.cuisine || ''}
                          onChange={(e) => setEditingRestaurant({ ...editingRestaurant, cuisine: e.target.value })}
                        />
                      </div>
                      <div className="field">
                        <label htmlFor="editRestAddress">Address</label>
                        <input
                          id="editRestAddress"
                          value={editingRestaurant.address || ''}
                          onChange={(e) => setEditingRestaurant({ ...editingRestaurant, address: e.target.value })}
                        />
                      </div>
                      <div className="field">
                        <label htmlFor="editRestPhone">Phone</label>
                        <input
                          id="editRestPhone"
                          value={editingRestaurant.phone || ''}
                          onChange={(e) => setEditingRestaurant({ ...editingRestaurant, phone: e.target.value })}
                        />
                      </div>
                      <div className="field">
                        <label htmlFor="editRestDesc">Description</label>
                        <textarea
                          id="editRestDesc"
                          rows={2}
                          value={editingRestaurant.description || ''}
                          onChange={(e) => setEditingRestaurant({ ...editingRestaurant, description: e.target.value })}
                        />
                      </div>
                      <button type="submit" className="btn btn-primary btn-block">
                        💾 Update Restaurant
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-block"
                        onClick={() => setEditingRestaurant(null)}
                        style={{ marginTop: '8px' }}
                      >
                        Cancel Editing
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleCreateRestaurant} className="dash-form">
                      <div className="field">
                        <label htmlFor="restName">Restaurant Name *</label>
                        <input
                          id="restName"
                          value={restForm.name}
                          onChange={(e) => {
                            const name = e.target.value;
                            setRestForm({
                              ...restForm,
                              name,
                              slug: name
                                .toLowerCase()
                                .replace(/[^a-z0-9]+/g, '-')
                                .replace(/(^-|-$)/g, ''),
                            });
                          }}
                          placeholder="e.g. Napoli Pizzeria"
                          required
                        />
                      </div>
                      <div className="field">
                        <label htmlFor="restSlug">URL Slug (lowercase letters & hyphens) *</label>
                        <input
                          id="restSlug"
                          value={restForm.slug}
                          onChange={(e) => setRestForm({ ...restForm, slug: e.target.value })}
                          placeholder="napoli-pizzeria"
                          required
                        />
                      </div>
                      <div className="field">
                        <label htmlFor="restCuisine">Cuisine</label>
                        <input
                          id="restCuisine"
                          value={restForm.cuisine}
                          onChange={(e) => setRestForm({ ...restForm, cuisine: e.target.value })}
                          placeholder="Italian, Japanese, Burgers..."
                        />
                      </div>
                      <div className="field">
                        <label htmlFor="restAddress">Address</label>
                        <input
                          id="restAddress"
                          value={restForm.address}
                          onChange={(e) => setRestForm({ ...restForm, address: e.target.value })}
                          placeholder="123 Food Street"
                        />
                      </div>
                      <div className="field">
                        <label htmlFor="restPhone">Phone</label>
                        <input
                          id="restPhone"
                          value={restForm.phone}
                          onChange={(e) => setRestForm({ ...restForm, phone: e.target.value })}
                          placeholder="+1 (555) 012-3456"
                        />
                      </div>
                      <div className="field">
                        <label htmlFor="restDesc">Description</label>
                        <textarea
                          id="restDesc"
                          rows={2}
                          value={restForm.description}
                          onChange={(e) => setRestForm({ ...restForm, description: e.target.value })}
                          placeholder="Brief summary of specialties..."
                        />
                      </div>
                      <button type="submit" className="btn btn-primary btn-block">
                        + Create Restaurant
                      </button>
                    </form>
                  )}
                </div>

                <div className="dash-list-box">
                  <h3>Active Restaurants ({restaurants.length})</h3>
                  <div className="mini-rest-list">
                    {restaurants.map((r) => (
                      <div key={r.id} className="mini-rest-card">
                        <div>
                          <h4>{r.name}</h4>
                          <span className="pill pill-cuisine">{r.cuisine || 'General'}</span>
                          <p className="muted-address">{r.address || 'No address set'}</p>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => setEditingRestaurant(r)}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-forest"
                            onClick={() => {
                              setSelectedRestaurantId(r.id);
                              setActiveTab('menu');
                            }}
                          >
                            Manage Menu →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
