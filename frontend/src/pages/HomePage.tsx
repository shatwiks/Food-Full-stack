import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authstore';
import { useToastStore } from '../store/toastStore';
import type { Restaurant } from '../types';

import Navbar from '../components/Navbar';
import RestaurantCard from '../components/RestaurantCard';
import RestaurantMenuModal from '../components/RestaurantMenuModal';
import CartDrawer from '../components/CartDrawer';
import OrdersModal from '../components/OrdersModal';
import OwnerDashboardModal from '../components/OwnerDashboardModal';
import AuthModal from '../components/AuthModal';
import ToastContainer from '../components/ToastContainer';

const CUISINES = ['All', 'Italian', 'Mexican', 'Japanese', 'American', 'Indian'];

export default function HomePage() {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Drawers state
  const [activeRestaurant, setActiveRestaurant] = useState<Restaurant | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);

  useEffect(() => {
    void fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiClient.get('/restaurants?limit=50');
      setRestaurants(response.data.data ?? []);
    } catch (loadError) {
      setError('Unable to load restaurants right now. Please verify backend is running.');
      addToast('Error loading restaurants', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredRestaurants = useMemo(() => {
    return restaurants.filter((r) => {
      const matchesCuisine =
        selectedCuisine === 'All' ||
        r.cuisine?.toLowerCase().includes(selectedCuisine.toLowerCase());

      const matchesSearch =
        searchQuery.trim() === '' ||
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.cuisine?.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesCuisine && matchesSearch;
    });
  }, [restaurants, selectedCuisine, searchQuery]);

  return (
    <div className="app-layout">
      <ToastContainer />

      <Navbar
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenOrders={() => setIsOrdersOpen(true)}
        onOpenDashboard={() => setIsDashboardOpen(true)}
      />

      <main className="main-content">
        {/* Hero Section */}
        <section className="hero-banner">
          <div className="hero-banner-inner">
            <div className="hero-text-content">
              <span className="hero-eyebrow">⚡ Fresh Meals & Fast Neighborhood Delivery</span>
              <h1 className="hero-heading">
                Discover exceptional food from <span className="highlight-text">local kitchens</span>.
              </h1>
              <p className="hero-subheading">
                Browse chef-crafted menus, customize your order, and get steaming hot dishes delivered to your doorstep in minutes.
              </p>

              {/* Search input bar */}
              <div className="search-bar-wrap">
                <div className="search-input-box">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by restaurant name, dish, or flavor..."
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="search-clear-btn"
                      onClick={() => setSearchQuery('')}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="hero-highlight-card">
              <div className="highlight-header">
                <span className="live-pulse"></span>
                <span>Live Availability</span>
              </div>
              <div className="highlight-stat">{restaurants.length} Restaurants</div>
              <p className="highlight-desc">
                {user
                  ? `Signed in as ${user.email} (${user.role.toLowerCase()})`
                  : 'Experience lightning-fast ordering across local favorite restaurants.'}
              </p>
              <div className="highlight-tags">
                <span>⏱️ ~25-35 min</span>
                <span>🔥 Free delivery $30+</span>
              </div>
            </div>
          </div>
        </section>

        {/* Cuisine Filter Pills */}
        <section className="filter-section">
          <div className="section-header">
            <div>
              <h2 className="section-title">Explore by Cuisine</h2>
              <p className="section-subtitle">Find your craving across top culinary traditions</p>
            </div>
          </div>

          <div className="cuisine-pills-row">
            {CUISINES.map((c) => (
              <button
                key={c}
                type="button"
                className={`cuisine-pill ${selectedCuisine === c ? 'active' : ''}`}
                onClick={() => setSelectedCuisine(c)}
              >
                {c === 'All' ? '🍽️ All Cuisines' : c === 'Italian' ? '🍕 Italian' : c === 'Mexican' ? '🌮 Mexican' : c === 'Japanese' ? '🍣 Japanese' : c === 'American' ? '🍔 American' : '🍛 Indian'}
              </button>
            ))}
          </div>
        </section>

        {/* Restaurant Grid Section */}
        <section id="restaurants-section" className="restaurants-section">
          <div className="section-header">
            <div>
              <h2 className="section-title">
                {selectedCuisine === 'All' ? 'Popular Restaurants' : `${selectedCuisine} Places`}
              </h2>
              <p className="section-subtitle">
                {filteredRestaurants.length} {filteredRestaurants.length === 1 ? 'kitchen' : 'kitchens'} open for orders
              </p>
            </div>

            <button
              type="button"
              className="btn btn-sm btn-outline-forest"
              onClick={fetchRestaurants}
              disabled={loading}
            >
              🔄 Refresh List
            </button>
          </div>

          {loading ? (
            <div className="loader-container">
              <div className="spinner"></div>
              <p>Fetching top restaurants…</p>
            </div>
          ) : error ? (
            <div className="error-banner">
              <p>{error}</p>
              <button type="button" className="btn btn-sm btn-primary" onClick={fetchRestaurants} style={{ marginTop: '12px' }}>
                Retry Connection
              </button>
            </div>
          ) : filteredRestaurants.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🔍</div>
              <h3>No restaurants found</h3>
              <p>Try selecting a different cuisine filter or clearing your search term.</p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setSelectedCuisine('All');
                  setSearchQuery('');
                }}
                style={{ marginTop: '16px' }}
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="restaurant-cards-grid">
              {filteredRestaurants.map((restaurant) => (
                <RestaurantCard
                  key={restaurant.id}
                  restaurant={restaurant}
                  onSelect={(r) => setActiveRestaurant(r)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="page-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="brand">
              <span className="brand-dot"></span>
              <span>OrderFlow</span>
            </div>
            <p>Modern multi-restaurant food ordering and kitchen management platform.</p>
          </div>
          <div className="footer-credits">
            <p>© {new Date().getFullYear()} OrderFlow. Full Stack Portfolio Project.</p>
          </div>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <RestaurantMenuModal
        restaurant={activeRestaurant}
        onClose={() => setActiveRestaurant(null)}
      />

      <CartDrawer
        onOpenAuth={() => setIsAuthOpen(true)}
        onOrderSuccess={() => setIsOrdersOpen(true)}
      />

      <OrdersModal
        isOpen={isOrdersOpen}
        onClose={() => setIsOrdersOpen(false)}
      />

      <OwnerDashboardModal
        isOpen={isDashboardOpen}
        onClose={() => setIsDashboardOpen(false)}
        onRefreshData={fetchRestaurants}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />
    </div>
  );
}
