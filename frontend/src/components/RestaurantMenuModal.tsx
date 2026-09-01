import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { useCartStore } from '../store/cartStore';
import { useToastStore } from '../store/toastStore';
import type { MenuItem, Restaurant } from '../types';

interface RestaurantMenuModalProps {
  restaurant: Restaurant | null;
  onClose: () => void;
}

export default function RestaurantMenuModal({ restaurant, onClose }: RestaurantMenuModalProps) {
  const [loading, setLoading] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [restaurantDetails, setRestaurantDetails] = useState<Restaurant | null>(restaurant);
  const [conflictItem, setConflictItem] = useState<{ item: MenuItem; restId: string; restName: string } | null>(null);

  const { addItem, clearCart, setIsOpen: openCart } = useCartStore();
  const { addToast } = useToastStore();

  useEffect(() => {
    if (!restaurant) return;
    setRestaurantDetails(restaurant);
    void loadMenu(restaurant.id);
  }, [restaurant]);

  const loadMenu = async (id: string) => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/restaurants/${id}`);
      if (res.data.data) {
        setRestaurantDetails(res.data.data);
        setMenuItems(res.data.data.menuItems || []);
      }
    } catch (err) {
      addToast('Failed to load menu items', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!restaurant) return null;

  const handleAddToCart = (item: MenuItem) => {
    if (!restaurantDetails) return;
    const added = addItem(item, restaurantDetails.id, restaurantDetails.name);
    if (!added) {
      setConflictItem({ item, restId: restaurantDetails.id, restName: restaurantDetails.name });
    } else {
      addToast(`Added "${item.name}" to cart!`, 'success');
    }
  };

  const handleConfirmSwitchRestaurant = () => {
    if (!conflictItem) return;
    clearCart();
    addItem(conflictItem.item, conflictItem.restId, conflictItem.restName);
    addToast(`Cart cleared & "${conflictItem.item.name}" added!`, 'success');
    setConflictItem(null);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-tag-row">
              <span className="pill pill-cuisine">{restaurantDetails?.cuisine || 'Kitchen'}</span>
              <span className="pill pill-status">Live Orders Active</span>
            </div>
            <h2 className="modal-title">{restaurantDetails?.name}</h2>
            <p className="modal-subtitle">{restaurantDetails?.description}</p>
            {restaurantDetails?.address && (
              <p className="modal-address">📍 {restaurantDetails.address} {restaurantDetails.phone ? `· 📞 ${restaurantDetails.phone}` : ''}</p>
            )}
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        {conflictItem && (
          <div className="cart-conflict-alert">
            <div className="alert-text">
              <strong>Your cart contains items from a different restaurant.</strong>
              <p>Would you like to empty your cart and start a new order from {conflictItem.restName}?</p>
            </div>
            <div className="alert-actions">
              <button
                type="button"
                className="btn btn-sm btn-outline-forest"
                onClick={() => setConflictItem(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={handleConfirmSwitchRestaurant}
              >
                Start New Cart
              </button>
            </div>
          </div>
        )}

        <div className="modal-body menu-container">
          <div className="menu-header">
            <h3>Menu Offerings</h3>
            <span className="menu-count-badge">{menuItems.length} items</span>
          </div>

          {loading ? (
            <div className="modal-loader">
              <div className="spinner"></div>
              <p>Loading dishes…</p>
            </div>
          ) : menuItems.length === 0 ? (
            <div className="empty-state">
              <p>No dishes are currently listed for this restaurant.</p>
            </div>
          ) : (
            <div className="menu-grid">
              {menuItems.map((item) => (
                <div key={item.id} className={`menu-card ${!item.isAvailable ? 'sold-out' : ''}`}>
                  <div className="menu-card-header">
                    <h4 className="dish-name">{item.name}</h4>
                    <span className="dish-price">${Number(item.price).toFixed(2)}</span>
                  </div>

                  {item.description && (
                    <p className="dish-description">{item.description}</p>
                  )}

                  <div className="menu-card-footer">
                    {item.isAvailable ? (
                      <button
                        type="button"
                        className="btn btn-sm btn-primary add-btn"
                        onClick={() => handleAddToCart(item)}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="5" x2="12" y2="19"></line>
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        Add to Order
                      </button>
                    ) : (
                      <span className="badge-sold-out">Currently Unavailable</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Back to Browse
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              onClose();
              openCart(true);
            }}
          >
            Review Cart & Checkout →
          </button>
        </div>
      </div>
    </div>
  );
}
