import type { Restaurant } from '../types';

interface RestaurantCardProps {
  restaurant: Restaurant;
  onSelect: (restaurant: Restaurant) => void;
}

const getCuisineIcon = (cuisine?: string | null) => {
  const c = cuisine?.toLowerCase() || '';
  if (c.includes('italian') || c.includes('pizza') || c.includes('pasta')) return '🍕';
  if (c.includes('mexican') || c.includes('taco')) return '🌮';
  if (c.includes('japanese') || c.includes('sushi') || c.includes('ramen')) return '🍣';
  if (c.includes('chinese') || c.includes('dim sum') || c.includes('sichuan') || c.includes('asian')) return '🥟';
  if (c.includes('burger') || c.includes('american')) return '🍔';
  if (c.includes('indian') || c.includes('curry') || c.includes('biryani')) return '🍛';
  if (c.includes('thai')) return '🍜';
  if (c.includes('french') || c.includes('bistro') || c.includes('dessert') || c.includes('bakery')) return '🥐';
  if (c.includes('mediterranean') || c.includes('greek')) return '🥗';
  return '🍽️';
};

export default function RestaurantCard({ restaurant, onSelect }: RestaurantCardProps) {
  const icon = getCuisineIcon(restaurant.cuisine);
  const itemCount = restaurant.menuItems ? restaurant.menuItems.length : undefined;

  return (
    <article className="restaurant-card" onClick={() => onSelect(restaurant)}>
      <div className="card-top">
        <div className="restaurant-avatar">{icon}</div>
        <div className="card-badge-container">
          {restaurant.cuisine && <span className="pill pill-cuisine">{restaurant.cuisine}</span>}
          <span className="pill pill-status">Open</span>
        </div>
      </div>

      <div className="card-body">
        <h3 className="restaurant-title">{restaurant.name}</h3>
        <p className="restaurant-description">
          {restaurant.description || 'Delicious culinary creations prepared fresh with local ingredients.'}
        </p>

        <div className="restaurant-details">
          {restaurant.address && (
            <div className="detail-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              <span>{restaurant.address}</span>
            </div>
          )}
          {restaurant.phone && (
            <div className="detail-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
              <span>{restaurant.phone}</span>
            </div>
          )}
        </div>
      </div>

      <div className="card-footer">
        <span className="menu-preview-text">
          {itemCount !== undefined ? `${itemCount} dishes available` : 'Full menu available'}
        </span>
        <button
          type="button"
          className="btn btn-outline-forest btn-sm"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(restaurant);
          }}
        >
          View Menu →
        </button>
      </div>
    </article>
  );
}
