# OrderFlow

OrderFlow is a multi-restaurant food ordering platform built as a monorepo for a portfolio project.

## Tech stack

- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL + Prisma ORM
- Frontend: React + TypeScript + Vite
- Local orchestration: Docker Compose

## Repo structure

- `backend/` — Express API, Prisma schema, migrations
- `frontend/` — Vite React app
- `docker-compose.yml` — PostgreSQL and backend services
- `.env.example` files — environment templates for backend and frontend

## Setup

1. Copy environment files if needed:
   - `backend/.env.example` -> `backend/.env`
   - `frontend/.env.example` -> `frontend/.env`

2. Start the local database and backend:

   ```bash
   docker compose up --build
   ```

3. Run Prisma migrations from the backend folder:

   ```bash
   cd backend
   npm install
   npx prisma migrate dev --name init
   ```

4. Start the Vite frontend:

   ```bash
   cd frontend
   npm install
   npm run dev -- --host 0.0.0.0
   ```

5. Open the frontend in a browser at:

   ```text
   http://localhost:5173
   ```

6. Health check endpoint:

   ```text
   http://localhost:3001/health
   ```

## Notes

- This phase is intentionally limited to project scaffolding, DB modeling, and app startup validation.
- Authentication, business APIs, and feature UI are not implemented yet.
