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

```markdown

## ⚡ Quickstart (Run Locally in 60s)

### Prerequisites
* **Node.js**: `v20.x` or later
* **Docker & Docker Compose**: Installed and running

### 1. Clone & Environment Setup
```bash
git clone [https://github.com/Meghana-kb10/Food-Ordering-Real-Time-Delivery-Platform.git](https://github.com/Meghana-kb10/Food-Ordering-Real-Time-Delivery-Platform.git)
cd Food-Ordering-Real-Time-Delivery-Platform

# Copy sample configs
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

```

### 2. Launch Database & Run Migrations

```bash
# Spin up PostgreSQL 15 container
docker compose up -d

# Install dependencies and seed schema
npm install
npm run prisma:migrate
npm run prisma:generate

```

### 3. Start Development Servers

```bash
# Terminal 1: Backend API (http://localhost:3001)
npm run backend:dev

# Terminal 2: Client UI (http://localhost:5173)
npm run frontend:dev

```

### 4. Run Automated Test Suites

```bash
cd backend && npm test

```

---

## 🏗️ System Architecture & Data Flow

```
[ React 18 + Vite Client ]
       │            │
  HTTP │            │ WS (Bidirectional)
       ▼            ▼
[ Node.js / Express Gateway ]
  ├─ Layer 1: JWT & Step-Up 2FA Validation Middleware
  ├─ Layer 2: Multi-Tenant RBAC Guard (Owner vs. Customer)
  └─ Layer 3: Database-Authoritative Billing Transactions
       │            │
       ▼            ▼
[ PostgreSQL 15 ] [ Socket.io Engine ]
(Prisma ORM)      (Rooms: `order:<id>`, `restaurant:<id>`)

```

---

## 🛡️ Core Engineering Highlights

### 1. Database-Authoritative Billing (Anti-Tamper)

* **Zero Client Trust:** Checkouts accept strictly `{ menuItemId, quantity }` pairs; client pricing parameters are dropped.
* **ACID Transactions:** The server evaluates active menu rates directly from PostgreSQL within a single transaction:

$$\text{Invoice Total} = \sum (\text{DB Price}_i \times \text{Quantity}_i)$$


* Eliminates client-side payload manipulation and parameter tampering vulnerabilities.

### 2. Step-Up 2FA State Machine & Brute-Force Defense

* **Two-Phase Authentication:** Login returns a short-lived, route-scoped `preAuthToken`. Session access/refresh tokens are released only upon verifying the SHA-256-hashed 6-digit OTP.
* **Atomic 3-Attempt Burn:** Failed verification attempts increment an atomic counter; the 3rd failed attempt invalidates the OTP record to prevent automated brute-forcing.
* **Cooldown Gates:** 60-second rate-limiting cooldown prevents OTP regeneration flooding.

### 3. Scoped Real-Time Synchronization

* **Isolated State Propagation:** Employs explicit room partitioning (`order:<orderId>` and `restaurant:<restaurantId>`) via Socket.io.
* **Zero Leakage:** Status transitions (`PENDING` $\rightarrow$ `PREPARING` $\rightarrow$ `OUT_FOR_DELIVERY` $\rightarrow$ `DELIVERED`) broadcast exclusively to authenticated subscribers, preventing multi-tenant data bleed.

---

## 💻 Tech Stack

* **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Zustand, Socket.io-client.
* **Backend:** Node.js, Express, TypeScript, Prisma ORM, Socket.io, bcrypt, jsonwebtoken.
* **Database & Testing:** PostgreSQL 15, Docker Compose, Vitest, Supertest.
* **CI/CD:** GitHub Actions (automated migrations, type-checks, security test runs on PR).

---

## ⚖️ Scalability & Production Roadmap

* **Distributed WebSockets:** Upgrade the in-memory room adapter to `@socket.io/redis-adapter` for horizontal multi-instance deployments behind an AWS Application Load Balancer.
* **Async Job Queuing:** Decouple transactional OTP emails from the HTTP cycle into a Redis-backed **BullMQ** queue with exponential backoff and dead-letter queue (DLQ) support.
* **Token Hardening:** Shift refresh token persistence from client storage to `HttpOnly`, `SameSite=Strict` cookies to mitigate XSS exposure.

```

```
