import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { useUIStore } from '../store/uiStore';
import type { Restaurant } from '../types';

import RestaurantCard from '../components/RestaurantCard';
import RestaurantMenuModal from '../components/RestaurantMenuModal';

const CUISINES = ['All', 'Indian', 'Italian', 'Mexican', 'Japanese', 'American', 'Chinese', 'French', 'Mediterranean'];

export default function HomePage() {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const { selectedCuisine, setSelectedCuisine, refreshTrigger } = useUIStore();

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRestaurant, setActiveRestaurant] = useState<Restaurant | null>(null);

  useEffect(() => {
    void fetchRestaurants();
  }, [refreshTrigger]);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiClient.get('/restaurants?limit=50');
      const rawData = response.data;
      const list = Array.isArray(rawData)
        ? rawData
        : Array.isArray(rawData?.data)
        ? rawData.data
        : [];
      setRestaurants(list);
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
    <>
      {/* Hero Section */}
      <section className="hero-banner">
        <div className="hero-banner-inner">
          <div className="hero-text-content">
            <span className="hero-eyebrow">⚡ Desi Zaika, Street Eats & Gourmet Dining</span>
            <h1 className="hero-heading">
              Discover exceptional food from <span className="highlight-text">local kitchens</span>.
            </h1>
            <p className="hero-subheading">
              Explore fragrant biryanis, woodfired pizzas, and artisan burgers crafted by master chefs and delivered piping hot.
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
                  placeholder="Search by restaurant name, dish (e.g. Biryani, Dosa), or cuisine..."
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
              <span className="highlight-title">Top Rated Today</span>
            </div>
            <div className="highlight-content">
              <h3>Dum Pukht Darbar</h3>
              <p className="highlight-cuisine">Awadhi & Mughlai • Charcoal Dum Biryani</p>
              <div className="highlight-badges">
                <span className="badge-pill">⭐ 4.9 (420+ reviews)</span>
                <span className="badge-pill">🛵 25-35 mins</span>
                <span className="badge-pill highlight-accent">₹300+ FREE Delivery</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cuisine Filter Tabs & Search Results Area */}
      <section className="restaurants-section" id="restaurants-section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Explore Premier Restaurants</h2>
            <p className="section-subtitle">
              Showing {filteredRestaurants.length} of {restaurants.length} kitchens in your city
            </p>
          </div>

          {/* Cuisine Filter Pills */}
          <div className="cuisine-filters-scroll">
            {CUISINES.map((cuisine) => (
              <button
                key={cuisine}
                type="button"
                className={`cuisine-pill ${selectedCuisine === cuisine ? 'active' : ''}`}
                onClick={() => setSelectedCuisine(cuisine)}
              >
                {cuisine === 'Indian' && '🍛 '}
                {cuisine === 'Italian' && '🍕 '}
                {cuisine === 'Mexican' && '🌮 '}
                {cuisine === 'Japanese' && '🍣 '}
                {cuisine === 'American' && '🍔 '}
                {cuisine === 'Chinese' && '🥟 '}
                {cuisine === 'French' && '🥐 '}
                {cuisine === 'Mediterranean' && '🥗 '}
                {cuisine}
              </button>
            ))}
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="banner banner-error">
            <span>{error}</span>
            <button type="button" className="btn btn-sm btn-outline-forest" onClick={fetchRestaurants}>
              Retry Connection
            </button>
          </div>
        )}

        {/* Restaurant Cards Grid */}
        {loading ? (
          <div className="loading-grid">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div key={idx} className="skeleton-card">
                <div className="skeleton-avatar"></div>
                <div className="skeleton-line title"></div>
                <div className="skeleton-line desc"></div>
                <div className="skeleton-line meta"></div>
              </div>
            ))}
          </div>
        ) : filteredRestaurants.length === 0 ? (
          <div className="empty-state-box">
            <div className="empty-icon">🔍</div>
            <h3>No restaurants found</h3>
            <p>We couldn't find any restaurants matching your current search or cuisine filter.</p>
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

      {/* Restaurant Menu Modal */}
      <RestaurantMenuModal
        restaurant={activeRestaurant}
        onClose={() => setActiveRestaurant(null)}
      />
    </>
  );
}
