import ThemeProvider from './components/ThemeProvider';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import CartDrawer from './components/CartDrawer';
import AuthModal from './components/AuthModal';
import OrdersModal from './components/OrdersModal';
import OwnerDashboardModal from './components/OwnerDashboardModal';
import ToastContainer from './components/ToastContainer';
import HomePage from './pages/HomePage';
import { useUIStore } from './store/uiStore';
import { useCartStore } from './store/cartStore';

export default function App() {
  const {
    isSidebarOpen,
    toggleSidebar,
    setSidebarOpen,
    isAuthOpen,
    setAuthOpen,
    isOrdersOpen,
    setOrdersOpen,
    isDashboardOpen,
    setDashboardOpen,
    setSelectedCuisine,
    triggerRefresh,
  } = useUIStore();
  const { setIsOpen: setIsCartOpen } = useCartStore();

  return (
    <ThemeProvider>
      <div className="app-layout">
        <ToastContainer />

        {/* Top Navigation Bar with Sun/Moon Theme Switcher & Sidebar Trigger */}
        <Navbar
          onToggleSidebar={toggleSidebar}
          onOpenAuth={() => setAuthOpen(true)}
          onOpenOrders={() => setOrdersOpen(true)}
          onOpenDashboard={() => setDashboardOpen(true)}
        />

        {/* Collapsible Navigation Sidebar */}
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onSelectCuisine={(cuisine) => setSelectedCuisine(cuisine)}
          onOpenCart={() => setIsCartOpen(true)}
          onOpenOrders={() => setOrdersOpen(true)}
          onOpenDashboard={() => setDashboardOpen(true)}
          onOpenAuth={() => setAuthOpen(true)}
        />

        {/* Central Content Container */}
        <main className="main-content">
          <HomePage />
        </main>

        {/* Global Modals & Slide-in Drawers */}
        <CartDrawer
          onOpenAuth={() => setAuthOpen(true)}
          onOrderSuccess={() => setOrdersOpen(true)}
        />

        <OrdersModal
          isOpen={isOrdersOpen}
          onClose={() => setOrdersOpen(false)}
        />

        <OwnerDashboardModal
          isOpen={isDashboardOpen}
          onClose={() => setDashboardOpen(false)}
          onRefreshData={triggerRefresh}
        />

        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setAuthOpen(false)}
        />
      </div>
    </ThemeProvider>
  );
}
