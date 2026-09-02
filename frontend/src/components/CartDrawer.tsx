import { useState } from 'react';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { useToastStore } from '../store/toastStore';
import { formatPrice } from '../utils/currency';

interface CartDrawerProps {
  onOpenAuth: () => void;
  onOrderSuccess: () => void;
}

export default function CartDrawer({ onOpenAuth, onOrderSuccess }: CartDrawerProps) {
  const { user } = useAuthStore();
  const {
    items,
    restaurantId,
    restaurantName,
    isOpen,
    setIsOpen,
    updateQuantity,
    removeItem,
    clearCart,
    subtotal,
  } = useCartStore();
  const { addToast } = useToastStore();

  const [deliveryAddress, setDeliveryAddress] = useState('742 Evergreen Terrace, Apt 4B');
  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState('');

  if (!isOpen) return null;

  const currentSubtotal = subtotal();
  const deliveryFee = currentSubtotal > 300 || currentSubtotal === 0 ? 0 : 40;
  const grandTotal = currentSubtotal + deliveryFee;

  const handleCheckout = async () => {
    if (!user) {
      addToast('Please sign in to place your order.', 'info');
      onOpenAuth();
      return;
    }

    if (items.length === 0 || !restaurantId) {
      addToast('Your cart is empty.', 'error');
      return;
    }

    if (!deliveryAddress.trim()) {
      setOrderError('Please enter a valid delivery address.');
      return;
    }

    try {
      setSubmitting(true);
      setOrderError('');

      const payload = {
        restaurantId,
        deliveryAddress: deliveryAddress.trim(),
        items: items.map((i) => ({
          menuItemId: i.menuItem.id,
          quantity: i.quantity,
        })),
      };

      const res = await apiClient.post('/orders', payload);
      if (res.data.data) {
        addToast('Order placed successfully!', 'success');
        clearCart();
        setIsOpen(false);
        onOrderSuccess();
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to place order. Please try again.';
      setOrderError(msg);
      addToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="drawer-backdrop" onClick={() => setIsOpen(false)}>
      <aside className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div>
            <h3>Your Order</h3>
            {restaurantName && <p className="drawer-rest-name">From: {restaurantName}</p>}
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={() => setIsOpen(false)}
            aria-label="Close cart"
          >
            ✕
          </button>
        </div>

        <div className="drawer-body">
          {items.length === 0 ? (
            <div className="empty-cart">
              <div className="empty-cart-icon">🛒</div>
              <h4>Your cart is empty</h4>
              <p>Explore nearby restaurants and add your favorite dishes to begin your feast.</p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setIsOpen(false)}
                style={{ marginTop: '16px' }}
              >
                Browse Restaurants
              </button>
            </div>
          ) : (
            <>
              <div className="cart-items-list">
                {items.map((item) => (
                  <div key={item.menuItem.id} className="cart-item-row">
                    <div className="cart-item-info">
                      <div className="cart-item-title">{item.menuItem.name}</div>
                      <div className="cart-item-unit-price">
                        {formatPrice(item.menuItem.price)} each
                      </div>
                    </div>

                    <div className="cart-item-actions">
                      <div className="qty-controls">
                        <button
                          type="button"
                          className="qty-btn"
                          onClick={() => updateQuantity(item.menuItem.id, -1)}
                          aria-label="Decrease quantity"
                        >
                          -
                        </button>
                        <span className="qty-val">{item.quantity}</span>
                        <button
                          type="button"
                          className="qty-btn"
                          onClick={() => updateQuantity(item.menuItem.id, 1)}
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>

                      <div className="cart-item-total">
                        {formatPrice(Number(item.menuItem.price) * item.quantity)}
                      </div>

                      <button
                        type="button"
                        className="btn-trash"
                        onClick={() => removeItem(item.menuItem.id)}
                        aria-label="Remove item"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="cart-section address-section">
                <label htmlFor="deliveryAddress">Delivery Address</label>
                <input
                  id="deliveryAddress"
                  type="text"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Enter your street address, building/apt..."
                  required
                />
              </div>

              <div className="cart-summary">
                <div className="summary-line">
                  <span>Subtotal</span>
                  <span>{formatPrice(currentSubtotal)}</span>
                </div>
                <div className="summary-line">
                  <span>Delivery Fee</span>
                  <span>
                    {deliveryFee === 0 ? (
                      <span className="free-tag">FREE (Orders ₹300+)</span>
                    ) : (
                      formatPrice(deliveryFee)
                    )}
                  </span>
                </div>
                <div className="summary-line total-line">
                  <span>Grand Total</span>
                  <span>{formatPrice(grandTotal)}</span>
                </div>
              </div>

              {orderError && <div className="error-banner">{orderError}</div>}
            </>
          )}
        </div>

        {items.length > 0 && (
          <div className="drawer-footer">
            <div className="footer-actions">
              <button
                type="button"
                className="btn btn-text btn-sm"
                onClick={clearCart}
              >
                Clear Cart
              </button>
              <button
                type="button"
                className="btn btn-primary btn-block"
                disabled={submitting}
                onClick={handleCheckout}
              >
                {submitting
                  ? 'Processing Order…'
                  : user
                  ? `Place Order · ${formatPrice(grandTotal)}`
                  : 'Sign in to Place Order'}
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
