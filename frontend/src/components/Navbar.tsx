import { Sun, Moon, ShoppingBag, ClipboardList, LayoutDashboard, LogOut } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { useThemeStore } from '../store/themeStore';

interface NavbarProps {
  onOpenAuth: () => void;
  onOpenOrders: () => void;
  onOpenDashboard: () => void;
}

export default function Navbar({ onOpenAuth, onOpenOrders, onOpenDashboard }: NavbarProps) {
  const { user, logout } = useAuthStore();
  const { totalCount, setIsOpen } = useCartStore();
  const { theme, toggleTheme } = useThemeStore();
  const itemCount = totalCount();

  const isOwnerOrAdmin = user?.role === 'RESTAURANT_OWNER' || user?.role === 'ADMIN';

  return (
    <header className="top-nav">
      <div className="nav-container">
        <a href="/" className="brand">
          <span className="brand-dot"></span>
          <span className="brand-text">
            Order<span className="brand-gradient">Flow</span>
          </span>
          <span className="brand-badge">PRO</span>
        </a>

        <div className="nav-actions">
          {/* Futuristic Theme Switcher */}
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            <div className="theme-toggle-icon-wrap">
              {theme === 'dark' ? (
                <Sun className="theme-icon sun-icon" size={17} />
              ) : (
                <Moon className="theme-icon moon-icon" size={17} />
              )}
            </div>
            <span className="theme-toggle-text">{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>

          {user && (
            <button
              type="button"
              className="btn btn-text nav-link"
              onClick={onOpenOrders}
            >
              <ClipboardList size={17} className="nav-btn-icon" />
              <span>Orders</span>
            </button>
          )}

          {isOwnerOrAdmin && (
            <button
              type="button"
              className="btn btn-outline-forest nav-link glow-on-hover"
              onClick={onOpenDashboard}
            >
              <LayoutDashboard size={17} className="nav-btn-icon" />
              <span>{user?.role === 'ADMIN' ? 'Admin Portal' : 'Owner Studio'}</span>
            </button>
          )}

          <button
            type="button"
            className="btn btn-cart"
            onClick={() => setIsOpen(true)}
            aria-label="View Cart"
          >
            <ShoppingBag size={18} className="cart-bag-icon" />
            <span className="cart-label">Cart</span>
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
                <LogOut size={16} />
                <span className="signout-text">Exit</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-primary glow-btn"
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
