# Frontend — SmallBiz Operations

React + TypeScript + Vite web application for the SmallBiz Operations platform.

## Prerequisites

- Node.js 18+
- npm 9+

## Setup & Running

```bash
# 1. Navigate to the frontend folder
cd frontend

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

App runs at `http://localhost:5173`

## Available Scripts

| Script          | Description                                  |
|-----------------|----------------------------------------------|
| `npm run dev`   | Start local dev server with hot reload       |
| `npm run build` | Type-check and build for production          |
| `npm run preview` | Preview the production build locally       |

## Project Structure

```
frontend/
├── src/
│   ├── pages/          # Top-level route pages
│   │   ├── LandingPage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── POSPage.tsx
│   │   ├── InventoryPage.tsx
│   │   ├── StaffPage.tsx
│   │   ├── ProcurementPage.tsx
│   │   ├── DashboardPage.tsx
│   │   └── SettingsPage.tsx
│   ├── components/     # Reusable UI components grouped by feature
│   │   ├── ui/         # Generic UI primitives (Button, Input, Modal, etc.)
│   │   ├── dashboard/  # Charts and insight cards
│   │   ├── inventory/  # Batch list, form, matrix view
│   │   ├── pos/        # Cart, keypad, price grid, category tabs
│   │   ├── procurement/# Vendor cards, order builder
│   │   ├── retention/  # Audit log, billing mode, data wipe controls
│   │   └── staff/      # Clock widget, leaderboard, roster
│   ├── layouts/        # AppLayout wrapping authenticated pages
│   ├── store/          # Zustand global state stores
│   │   ├── cartStore.ts
│   │   ├── credentialsStore.ts
│   │   ├── gpsSettingsStore.ts
│   │   ├── roleStore.ts
│   │   ├── rosterStore.ts
│   │   ├── shopStore.ts
│   │   └── usersStore.ts
│   ├── lib/            # Utilities and mock data
│   │   ├── mock.ts     # Mock data for development
│   │   ├── utils.ts    # Helper functions
│   │   └── credentials.json  # Dev login credentials
│   ├── data/           # Static JSON data files
│   ├── types/          # Shared TypeScript types
│   ├── App.tsx         # Root router setup
│   ├── main.tsx        # Entry point
│   └── index.css       # Global styles and CSS variables
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## Routes

| Path           | Page             | Auth Required |
|----------------|------------------|---------------|
| `/`            | Landing          | No            |
| `/login`       | Login            | No            |
| `/register`    | Register Store   | No            |
| `/pos`         | Point of Sale    | Yes           |
| `/inventory`   | Inventory        | Yes           |
| `/staff`       | Staff Management | Yes           |
| `/procurement` | Procurement      | Yes           |
| `/dashboard`   | Dashboard        | Yes           |
| `/settings`    | Settings         | Yes           |

## Demo Login Credentials

| Role    | Email / User ID           | Password            |
|---------|---------------------------|---------------------|
| Owner   | ramesh@sharmagarments.com | Owner@123           |
| Manager | mak650650@gmail.com       | mak650650@gmail.com |
| Staff   | 9450946772                | — (ID login)        |
| Staff   | 9876543213                | — (ID login)        |
| Staff   | 9876543214                | — (ID login)        |

## Tech Stack

- **React 19** with TypeScript
- **Vite 7** — build tool and dev server
- **Tailwind CSS v4** — utility-first styling
- **Zustand 5** — global state management
- **React Router DOM v7** — client-side routing
- **Recharts** — charting library for dashboard
- **Zod** — schema validation

## Notes

- All data is currently mocked locally via `src/lib/mock.ts` and JSON files — no backend API calls are made.
- Once the backend is ready, replace mock data sources in the stores with real API calls.
