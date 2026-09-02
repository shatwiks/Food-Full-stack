import { 
  X, 
  Compass, 
  Flame, 
  Globe2, 
  ShoppingBag, 
  PackageCheck, 
  ChefHat, 
  ShieldCheck, 
  LogIn, 
  LogOut,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCuisine: (cuisine: string) => void;
  onOpenCart: () => void;
  onOpenOrders: () => void;
  onOpenDashboard: () => void;
  onOpenAuth: () => void;
}

export default function Sidebar({
  isOpen,
  onClose,
  onSelectCuisine,
  onOpenCart,
  onOpenOrders,
  onOpenDashboard,
  onOpenAuth,
}: SidebarProps) {
  const { user, logout } = useAuthStore();
  const { totalCount } = useCartStore();
  const itemCount = totalCount();

  if (!isOpen) return null;

  const isOwnerOrAdmin = user?.role === 'RESTAURANT_OWNER' || user?.role === 'ADMIN';

  const handleCuisineClick = (cuisine: string) => {
    onSelectCuisine(cuisine);
    onClose();
    // Scroll to restaurants section smoothly
    const el = document.getElementById('restaurants-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleExploreAll = () => {
    onSelectCuisine('All');
    onClose();
    const el = document.getElementById('restaurants-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="sidebar-backdrop" onClick={onClose}>
      <aside className="sidebar-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <div className="brand">
            <span className="brand-dot"></span>
            <span className="brand-text">
              Order<span className="brand-gradient">Flow</span>
            </span>
            <span className="brand-badge">PRO</span>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* User Card */}
        <div className="sidebar-user-section">
          {user ? (
            <div className="sidebar-user-card">
              <div className="user-initials">
                {user.firstName ? user.firstName[0].toUpperCase() : user.email[0].toUpperCase()}
              </div>
              <div className="sidebar-user-meta">
                <span className="sidebar-user-name">
                  {user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email.split('@')[0]}
                </span>
                <span className="sidebar-user-email">{user.email}</span>
                <span className={`role-tag role-${user.role.toLowerCase()}`}>
                  {user.role === 'RESTAURANT_OWNER' ? 'Restaurant Owner' : user.role === 'ADMIN' ? 'Admin' : 'Customer'}
                </span>
              </div>
            </div>
          ) : (
            <div className="sidebar-auth-cta" onClick={() => { onClose(); onOpenAuth(); }}>
              <div className="auth-cta-icon">
                <Sparkles size={20} />
              </div>
              <div className="auth-cta-text">
                <strong>Sign In / Create Account</strong>
                <p>2FA secure login & order tracking</p>
              </div>
              <ChevronRight size={18} className="cta-arrow" />
            </div>
          )}
        </div>

        {/* Sidebar Navigation */}
        <nav className="sidebar-nav">
          <div className="sidebar-section-title">Discovery</div>
          <button
            type="button"
            className="sidebar-nav-item"
            onClick={handleExploreAll}
          >
            <Compass size={18} className="nav-icon text-cyan" />
            <span>Explore All Kitchens</span>
          </button>

          <button
            type="button"
            className="sidebar-nav-item highlight-indian"
            onClick={() => handleCuisineClick('Indian')}
          >
            <Flame size={18} className="nav-icon text-amber" />
            <span className="sidebar-item-label">
              <span>Indian Specials (Desi Zaika)</span>
              <span className="sidebar-hot-pill">🔥 Trending</span>
            </span>
          </button>

          {/* Quick Sub-Cuisines */}
          <div className="sidebar-cuisine-grid">
            <button
              type="button"
              className="cuisine-quick-chip"
              onClick={() => handleCuisineClick('Indian')}
            >
              🍛 Biryani & Curry
            </button>
            <button
              type="button"
              className="cuisine-quick-chip"
              onClick={() => handleCuisineClick('Italian')}
            >
              🍕 Italian
            </button>
            <button
              type="button"
              className="cuisine-quick-chip"
              onClick={() => handleCuisineClick('Mexican')}
            >
              🌮 Mexican
            </button>
            <button
              type="button"
              className="cuisine-quick-chip"
              onClick={() => handleCuisineClick('Japanese')}
            >
              🍣 Japanese
            </button>
            <button
              type="button"
              className="cuisine-quick-chip"
              onClick={() => handleCuisineClick('American')}
            >
              🍔 American
            </button>
          </div>

          <div className="sidebar-section-title">Ordering & Activity</div>
          <button
            type="button"
            className="sidebar-nav-item"
            onClick={() => {
              onClose();
              onOpenCart();
            }}
          >
            <ShoppingBag size={18} className="nav-icon text-emerald" />
            <span className="sidebar-item-label">
              <span>My Cart</span>
              {itemCount > 0 && <span className="cart-badge">{itemCount}</span>}
            </span>
          </button>

          <button
            type="button"
            className="sidebar-nav-item"
            onClick={() => {
              onClose();
              if (user) {
                onOpenOrders();
              } else {
                onOpenAuth();
              }
            }}
          >
            <PackageCheck size={18} className="nav-icon text-cyan" />
            <span>Active Orders & Live Tracker</span>
          </button>

          {isOwnerOrAdmin && (
            <>
              <div className="sidebar-section-title">Management</div>
              <button
                type="button"
                className="sidebar-nav-item"
                onClick={() => {
                  onClose();
                  onOpenDashboard();
                }}
              >
                <ChefHat size={18} className="nav-icon text-violet" />
                <span>
                  {user?.role === 'ADMIN' ? 'System Admin Portal' : 'Kitchen Management Studio'}
                </span>
              </button>
            </>
          )}

          <div className="sidebar-section-title">Security</div>
          <button
            type="button"
            className="sidebar-nav-item"
            onClick={() => {
              onClose();
              onOpenAuth();
            }}
          >
            <ShieldCheck size={18} className="nav-icon text-emerald" />
            <span>2FA OTP & Account Security</span>
          </button>
        </nav>

        {/* Sidebar Footer Actions */}
        <div className="sidebar-footer">
          {user ? (
            <button
              type="button"
              className="btn btn-outline-danger btn-block"
              onClick={() => {
                logout();
                onClose();
              }}
            >
              <LogOut size={16} />
              <span>Sign Out ({user.email.split('@')[0]})</span>
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-block glow-btn"
              onClick={() => {
                onClose();
                onOpenAuth();
              }}
            >
              <LogIn size={16} />
              <span>Sign In with 2FA</span>
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}
