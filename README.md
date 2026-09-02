# 🍽️ OrderFlow — Enterprise Multi-Restaurant Food Ordering & Real-Time Fulfillment Engine

[![CI Pipeline](https://github.com/shatwiks/Food-Full-stack/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/shatwiks/Food-Full-stack/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg?logo=node.js)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19.x-61dafb.svg?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7.x-646cff.svg?logo=vite)](https://vitejs.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-6.x-2D3748.svg?logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791.svg?logo=postgresql)](https://www.postgresql.org/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.x-010101.svg?logo=socket.io)](https://socket.io/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED.svg?logo=docker)](https://www.docker.com/)
[![Vitest](https://img.shields.io/badge/Vitest-3.x-FCC72B.svg?logo=vitest)](https://vitest.dev/)

**OrderFlow** is a full-stack, multi-tenant food ordering platform and real-time restaurant fulfillment system engineered with a security-first posture, database-authoritative billing, and low-latency WebSocket state propagation.

---

## 🏛️ Core Design Principles

1. **Security-First Architecture**: Mandatory two-factor authentication (2FA OTP) step-up workflow, bcrypt password hashing, rotating JWT access/refresh tokens with database-level revocation, and strict multi-tenant Role-Based Access Control (RBAC).
2. **Database-Authoritative Integrity**: Zero trust in client calculations. All order prices, item modifiers, and status transitions are mathematically calculated and validated server-side against immutable database records.
3. **Event-Driven & Scoped Real-Time**: Scoped WebSocket room segregation (`order:<id>` and `restaurant:<id>`) ensuring instant order state propagation with zero cross-tenant data leakage.

---

## 📐 System Architecture

```mermaid
flowchart TD
    subgraph Client ["Frontend Client (React 19 + TypeScript + Vite)"]
        UI["UI Layer\n(Modals, Menus, Dashboard, Cart)"]
        Zustand["Zustand State Stores\n(authStore, cartStore, toastStore)"]
        Axios["Axios API Client\n(JWT Interceptor & 401 Handler)"]
        SocketClient["Socket.io Client\n(Real-Time Order & Owner Rooms)"]
    end

    subgraph Gateway ["Express 5 REST API + Socket.io Server"]
        Router["Express Router\n(/auth, /restaurants, /menu, /orders)"]
        AuthMW["Security Middleware\n(JWT Auth, 2FA Step-Up, RBAC Guard)"]
        SocketServer["Socket.io Engine\n(Handshake Auth, Room Segregation)"]
        Controllers["Business Controllers\n(Order, Menu, Restaurant, Auth)"]
    end

    subgraph Security ["Auth & Security Subsystem"]
        OTP["2FA OTP Engine\n(Hash Verifier, 3-Attempt Burn, 60s Cooldown)"]
        Mailer["Transactional Mailer\n(Resend API / Dev Console Sink)"]
    end

    subgraph Data ["Persistence Layer"]
        Prisma["Prisma ORM Client"]
        Postgres[(PostgreSQL 15 Database\nMulti-Tenant Relational Schema)]
    end

    UI --> Zustand
    Zustand --> Axios
    Zustand --> SocketClient

    Axios --> Router
    SocketClient <--> SocketServer

    Router --> AuthMW
    AuthMW --> Controllers
    Controllers --> OTP
    OTP --> Mailer
    Controllers --> Prisma
    SocketServer <--> Controllers
    Prisma --> Postgres
```

---

## 🔐 Security Architecture Deep-Dive

### 1. 2FA Step-Up Authentication State Machine
Authentication employs a two-phase credential validation process:
- **Phase 1 (`POST /api/auth/login`)**: Validates email and bcrypt password hash. Instead of returning a full session token, the server returns a restricted, short-lived `preAuthToken` (scoped strictly to 2FA verification) and generates a cryptographically random 6-digit OTP code hashed with SHA-256.
- **Phase 2 (`POST /api/auth/verify-2fa`)**: The client presents the `preAuthToken` alongside the 6-digit OTP. Upon successful hash comparison, full `accessToken` and database-persisted `refreshToken` pairs are issued.

### 2. Brute-Force & Flooding Protection
- **3-Attempt Burn Policy**: Failed OTP attempts increment an atomic counter. Upon the 3rd failed attempt, the OTP record is permanently invalidated, requiring re-authentication.
- **60-Second Cooldown**: Rate limiting prevents OTP generation spamming and email flooding.

### 3. Database-Authoritative Pricing (Anti-Tampering)
Client checkout payloads strictly submit item IDs and quantities:
```json
{
  "restaurantId": "cly123456",
  "items": [{ "menuItemId": "item_abc", "quantity": 2 }]
}
```
The server queries the database for active prices and executes calculations within a database transaction:
$$\text{Total Amount} = \sum (\text{DB Price}_i \times \text{Quantity}_i)$$
Any client-supplied prices are completely discarded, preventing parameter tampering and financial fraud.

### 4. Multi-Tenant RBAC Boundary Enforcement
Every mutating endpoint verifies ownership claims against database relations:
- `RESTAURANT_OWNER` can only modify menu items and status of orders belonging to restaurants matching `ownerId == req.user.id`.
- `CUSTOMER` can only view and track orders where `userId == req.user.id`.
- Unauthorized cross-tenant mutations immediately return `403 Forbidden`.

---

## ⚡ Real-Time Order Tracking

Order state transitions follow an explicit finite state machine:
$$\text{PENDING} \longrightarrow \text{CONFIRMED} \longrightarrow \text{PREPARING} \longrightarrow \text{OUT\_FOR\_DELIVERY} \longrightarrow \text{DELIVERED}$$

### Room Segregation Strategy
- **Customer Tracker**: Connected clients join `order:<orderId>`. When the restaurant owner updates the order status, the server broadcasts an `order_status_updated` event exclusively to that room.
- **Owner Dashboard**: Owners join `restaurant:<restaurantId>`. When a new order is submitted, a `new_order` event is dispatched in real-time without polling.

---

---

## 🎨 Cyber-Luxury UI & Experience Engine

OrderFlow features a modern **"Cyber-Luxury / High-Tech Gourmet"** frontend interface engineered for maximum visual impact and responsiveness:

### 1. Dynamic Dark / Light Mode Switcher
- **Dark Mode (Default Signature Look)**: Deep obsidian void (`#080a0f`) layered with multi-point radial glow meshes, frosted glass panels (`background: rgba(16, 22, 34, 0.75)`, `backdrop-filter: blur(20px)`), neon emerald (`#00f59b`) primary accents, cyber-amber (`#f5a623`) pricing, and cool cyan (`#00e5ff`) live indicators.
- **Light Mode**: High-contrast alabaster ivory (`#f8fafc`) with emerald highlights and champagne gold accents.
- **State Synchronization**: Persisted across browser sessions in `localStorage` via Zustand (`themeStore.ts`) with immediate `<html data-theme="...">` DOM synchronization and zero-flash loading.

### 2. Collapsible Navigation Sidebar (`Sidebar.tsx`)
- Accessible via the hamburger navigation button on the top-left of the navbar.
- Glassmorphic slide-in drawer featuring:
  - 🧭 **Explore All Kitchens**: Instantly scrolls and resets filters.
  - 🍛 **Indian Specials (Desi Zaika)**: Filter directly to authentic North & South Indian dishes with a glowing `🔥 Trending` badge.
  - 🍱 **Quick Cuisines Grid**: Quick-filter chips for Biryani & Curry, Italian, Mexican, Japanese, and American.
  - 🛒 **My Cart & Active Orders Tracker**: One-click slide-in drawer and real-time status tracker.
  - 👨‍🍳 **Kitchen Management Studio**: Role-gated portal for `RESTAURANT_OWNER` and `ADMIN`.
  - 🛡️ **2FA & Account Security**: Direct trigger for the authentication modal.

### 3. Indian Cuisine Expansion & Currency Engine (INR ₹)
- **Currency Formatter (`currency.ts`)**: Built-in `formatPrice` utility applying standard Indian numbering system formatting (`₹380`, `₹1,250`, etc.) across restaurant menus, cart drawer, order summaries, and owner revenue KPIs.
- **Localized Thresholds**: Free delivery for orders over **₹300+**, with standard ₹40 delivery fee for smaller carts.
- **Authentic Seeded Kitchens**:
  - **Dum Pukht Darbar** (Awadhi & Mughlai): Lucknowi Chicken Dum Biryani (₹380), Paneer Butter Masala (₹290), Garlic Butter Naan (₹60), Dal Makhani (₹240).
  - **Dakshin Flavors** (South Indian / Chettinad): Ghee Masala Dosa (₹160), Chettinad Chicken Pepper Fry (₹320), Medu Vada Plate (₹110), Traditional Filter Coffee (₹70).
  - **Spice Route Biryani & Curry**: Hyderabadi Dum Chicken Biryani (₹340), Butter Chicken with Garlic Naan (₹310), Paneer Tikka Masala (₹260), Alphonso Mango Lassi (₹90).

---

## 🛠️ Tech Stack & Monorepo Structure

```text
orderflow/
├── .github/workflows/ci.yml    # GitHub Actions CI pipeline (Postgres service, tests, lint)
├── docker-compose.yml          # PostgreSQL 15 container definition
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Relational models (User, Restaurant, MenuItem, Order, Otp)
│   │   ├── seed.ts             # Multi-tenant demo users and authentic Indian & global kitchens
│   │   └── migrations/         # Version-controlled SQL migrations
│   ├── src/
│   │   ├── controllers/        # Business logic & request validation
│   │   ├── middleware/         # JWT Auth, 2FA guard, RBAC guards, error handling
│   │   ├── routes/             # RESTful API route definitions
│   │   ├── socket.ts           # WebSocket connection handling & room events
│   │   ├── utils/              # mailer.ts (Resend API & dev console sink), jwt.ts
│   │   └── app.ts / server.ts  # Express app entry points
│   └── tests/                  # Vitest integration & security suites
├── frontend/
│   ├── src/
│   │   ├── api/client.ts       # Axios client with bearer token interceptor
│   │   ├── components/         # Navbar, Sidebar, Modals, Drawers, RestaurantCards
│   │   ├── pages/              # HomePage with responsive cuisine filters & search
│   │   ├── store/              # Zustand state stores (authStore, cartStore, themeStore, toastStore)
│   │   ├── utils/              # currency.ts (Indian Rupee ₹ formatter)
│   │   └── styles.css          # Cyber-luxury design system & dark/light mode tokens
└── package.json                # Monorepo workspace orchestration
```

---

## 🚀 Local Development Quickstart

### Prerequisites
- [Node.js](https://nodejs.org/) (v20.x or higher)
- [Docker & Docker Compose](https://www.docker.com/)

### 1. Clone & Configure Environment
```bash
git clone https://github.com/shatwiks/Food-Full-stack.git
cd Food-Full-stack

# Copy environment variables
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### 2. Start PostgreSQL via Docker Compose
```bash
docker compose up -d
```

### 3. Install Dependencies & Run Database Migrations
```bash
# Install all monorepo dependencies
npm install

# Run Prisma migrations & generate client
npm run prisma:migrate
npm run prisma:generate
```

### 4. Start Development Servers
```bash
# Terminal 1: Backend API (runs on port 3001)
npm run backend:dev

# Terminal 2: Frontend Client (runs on port 5173)
npm run frontend:dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

---

## 🧪 Automated Testing & CI/CD Pipeline

The project includes an end-to-end integration and security test suite built with **Vitest** and **Supertest**.

### Run Test Suite Locally
```bash
cd backend
npm test
```

### Continuous Integration (GitHub Actions)
Every pull request and push to the **`master`** branch triggers the automated CI pipeline:
1. Provisions a dedicated `postgres:15-alpine` container service.
2. Applies Prisma database migrations (`npx prisma migrate deploy`).
3. Executes backend TypeScript type-checking and linting.
4. Executes frontend production bundle compilation (`npm run build`).
5. Runs the integration test suite validating the 2FA lifecycle, RBAC rules, price calculation integrity, and WebSocket handlers.

---

## 💡 Engineering Trade-Offs & Scalability (Interview Talking Points)

### 1. In-Memory Socket.io vs. Redis Pub/Sub Adapter
- **Current Choice**: Single-instance Socket.io in-memory room adapter for development simplicity and zero additional infrastructure dependencies.
- **Scale Path**: In a multi-instance horizontal cluster behind a load balancer, instances cannot broadcast to rooms on sibling nodes. Upgrading requires `@socket.io/redis-adapter` or `@socket.io/redis-streams-adapter` to distribute room messages across the cluster.

### 2. Synchronous Transactional Email vs. Asynchronous BullMQ Worker
- **Current Choice**: Synchronous dispatch via Resend API / development console sink with a 60-second rate-limiting cooldown.
- **Scale Path**: Under high concurrency, external SMTP/HTTP latencies block request threads. A production scale-out moves email dispatch to an asynchronous Redis-backed message queue (BullMQ) with automated retries, exponential backoff, and Dead-Letter Queue (DLQ) routing.

### 3. Token Storage & Session Security
- **Current Choice**: Access tokens stored in client application state / local storage for cross-origin flexibility.
- **Hardening Path**: Storing refresh tokens in `SameSite=Strict`, `HttpOnly`, `Secure` cookies prevents client-side script access (XSS mitigation), while access tokens remain strictly in-memory.
