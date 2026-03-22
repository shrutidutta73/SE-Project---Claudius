# Backend — SmallBiz Operations

> **Status: Not yet implemented.**
> This folder is a placeholder for the backend API that will serve the SmallBiz Operations frontend.

## Planned Responsibilities

- User authentication (Owner / Manager / Staff roles)
- Store registration and configuration
- Inventory and batch management API
- POS transaction recording
- Staff clock-in / clock-out tracking
- Procurement order management
- Data retention policies and audit logging

## Planned Tech Stack

> To be decided by the team. Possible options:

- **Runtime**: Node.js (Express / Fastify) or Python (FastAPI / Django)
- **Database**: PostgreSQL or MongoDB
- **Auth**: JWT-based authentication
- **ORM**: Prisma / Sequelize (Node) or SQLAlchemy (Python)

## Expected API Base URL

```
http://localhost:8000/api
```

## Getting Started (once implemented)

```bash
# Navigate to backend folder
cd backend

# Install dependencies (example for Node.js)
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database URL, JWT secret, etc.

# Run database migrations
npm run migrate

# Start development server
npm run dev
```

## Environment Variables (planned)

| Variable       | Description                        |
|----------------|------------------------------------|
| `PORT`         | Port to run the server on          |
| `DATABASE_URL` | Connection string for the database |
| `JWT_SECRET`   | Secret key for signing JWT tokens  |
| `NODE_ENV`     | `development` or `production`      |

## Connecting to Frontend

Once the backend is running, update the frontend stores in `frontend/src/store/` to replace mock data with real API calls pointing to `http://localhost:8000/api`.
