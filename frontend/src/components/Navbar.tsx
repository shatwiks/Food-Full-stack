import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';

interface NavbarProps {
  onOpenAuth: () => void;
  onOpenOrders: () => void;
  onOpenDashboard: () => void;
}

export default function Navbar({ onOpenAuth, onOpenOrders, onOpenDashboard }: NavbarProps) {
  const { user, logout } = useAuthStore();
  const { totalCount, setIsOpen } = useCartStore();
  const itemCount = totalCount();

  const isOwnerOrAdmin = user?.role === 'RESTAURANT_OWNER' || user?.role === 'ADMIN';

  return (
    <header className="top-nav">
      <div className="nav-container">
        <a href="/" className="brand">
          <span className="brand-dot"></span>
          <span>OrderFlow</span>
        </a>

        <div className="nav-actions">
          {user && (
            <button
              type="button"
              className="btn btn-text nav-link"
              onClick={onOpenOrders}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              My Orders
            </button>
          )}

          {isOwnerOrAdmin && (
            <button
              type="button"
              className="btn btn-outline-forest nav-link"
              onClick={onOpenDashboard}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="3" y1="9" x2="21" y2="9"></line>
                <line x1="9" y1="21" x2="9" y2="9"></line>
              </svg>
              {user?.role === 'ADMIN' ? 'Admin Portal' : 'Owner Dashboard'}
            </button>
          )}

          <button
            type="button"
            className="btn btn-cart"
            onClick={() => setIsOpen(true)}
            aria-label="View Cart"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            <span>Cart</span>
            {itemCount > 0 && <span className="cart-badge">{itemCount}</span>}
          </button>

          {user ? (
            <div className="user-profile-menu">
              <div className="user-info-chip">
                <span className="user-initials">
                  {user.firstName ? user.firstName[0].toUpperCase() : user.email[0].toUpperCase()}
                </span>
                <span className="user-email-text">{user.email}</span>
                <span className={`role-tag role-${user.role.toLowerCase()}`}>
                  {user.role === 'RESTAURANT_OWNER' ? 'Owner' : user.role === 'ADMIN' ? 'Admin' : 'Customer'}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-text-danger"
                onClick={logout}
                title="Sign out"
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={onOpenAuth}
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
