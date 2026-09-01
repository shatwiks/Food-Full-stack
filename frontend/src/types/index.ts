export type UserRole = 'CUSTOMER' | 'RESTAURANT_OWNER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  firstName?: string | null;
  lastName?: string | null;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  name: string;
  description?: string | null;
  price: string | number;
  isAvailable: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  cuisine?: string | null;
  description?: string | null;
  address?: string | null;
  phone?: string | null;
  isActive: boolean;
  ownerId?: string;
  menuItems?: MenuItem[];
  createdAt?: string;
  updatedAt?: string;
}

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  quantity: number;
  unitPrice: string | number;
  menuItem?: MenuItem;
}

export interface Order {
  id: string;
  userId: string;
  restaurantId: string;
  status: OrderStatus;
  totalAmount: string | number;
  deliveryAddress?: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  restaurant?: Restaurant;
  user?: User;
}

export interface CartItem {
  menuItem: MenuItem;
  restaurantId: string;
  restaurantName: string;
  quantity: number;
}
