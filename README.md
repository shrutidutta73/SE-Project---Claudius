# SmallBiz Operations — Team Claudius 61

A retail shop management platform built for Indian garment and retail stores. Covers billing, inventory, staff management, procurement, and data privacy compliance.

## Project Structure

```
SE-Project---Claudius/
├── frontend/       # React + Vite web application (currently active)
└── backend/        # Backend API (not yet implemented)
```

## Features

- **Point of Sale** — Fast billing with price bands, custom amounts, UPI & cash
- **Inventory** — Stock batch tracking, vendor management, cost price and margin
- **Staff Management** — Clock-in tracking, shift roster, daily performance
- **Procurement** — Order builder and vendor cards
- **Dashboard** — Revenue charts, insights, and analytics
- **Data & Privacy** — Ephemeral billing, configurable retention, GST-safe data wipe

## Getting Started

### Frontend (currently available)

See [frontend/README.md](./frontend/README.md) for setup instructions.

```bash
cd frontend
npm install
npm run dev
```

App runs at `http://localhost:5173`

### Backend (not yet implemented)

See [backend/README.md](./backend/README.md) for planned setup once the backend is built.

## Demo Login Credentials

| Role    | Email / User ID              | Password            |
|---------|------------------------------|---------------------|
| Owner   | ramesh@sharmagarments.com    | Owner@123           |
| Manager | mak650650@gmail.com          | mak650650@gmail.com |
| Staff   | 9450946772 (Rahul Kumar)     | — (ID login)        |
| Staff   | 9876543213 (Priya Singh)     | — (ID login)        |
| Staff   | 9876543214 (Amit Yadav)      | — (ID login)        |

> Note: All data is currently mock/local — no real backend is connected.

## Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Frontend  | React 19, TypeScript, Vite          |
| Styling   | Tailwind CSS v4                     |
| State     | Zustand                             |
| Routing   | React Router DOM v7                 |
| Charts    | Recharts                            |
| Validation| Zod                                 |
| Backend   | TBD                                 |
