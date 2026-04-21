# 🚀 SmallBiz Operations — Team Claudius 61

A **retail shop management platform** built for Indian garment and retail stores.
It streamlines **billing, inventory, staff operations, procurement, and data privacy compliance** into a single system.

---

## 📁 Project Structure

```
SE-Project---Claudius/
├── frontend/       # React + Vite web application
├── backend/        # Node.js + Express API
├── docker-compose.yml
└── start.sh        # Script to run full system
```

---

## ✨ Features

* **Point of Sale (POS)**
  Fast billing using price bands, custom entries, and support for UPI & cash payments.

* **Inventory Management**
  Batch-based stock tracking with vendor linkage, cost price, and margin insights.

* **Staff Management**
  GPS-based clock-in/out, attendance tracking, and performance monitoring.

* **Procurement System**
  Smart reorder suggestions and vendor management interface.

* **Dashboard & Analytics**
  Revenue insights, trend visualization, and business performance metrics.

* **Data & Privacy Controls**
  Ephemeral billing mode, configurable retention, and GST-compliant data handling.

---

## 🧰 Tech Stack

### Frontend

* React 19 + TypeScript
* Vite
* Tailwind CSS
* Zustand
* React Router DOM
* Recharts

### Backend

* Node.js + Express (TypeScript)
* PostgreSQL 16
* pg driver

### Security & Validation

* JWT (HS256)
* bcrypt
* Zod
* CORS

### Logging & Testing

* Pino
* Jest + ts-jest + Supertest

### DevOps & Documentation

* Docker & Docker Compose
* OpenAPI 3.0.3 (33 endpoints)
* Git & GitHub

---

## ⚙️ Prerequisites

* Node.js (v18+)
* npm
* Docker & Docker Compose
* PostgreSQL client (`pg_isready`)
* Linux (GNOME Terminal required for script)

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd SE-Project---Claudius
```

---

### 2. Install Dependencies

#### Backend

```bash
cd backend
npm install
```

#### Frontend

```bash
cd ../frontend
npm install
```

---

### 3. Environment Setup

Create a `.env` file in the **backend** folder:

```env
PORT=3001
DATABASE_URL=postgres://smallbiz:password@localhost:5432/smallbiz
JWT_SECRET=your_secret_key
```

---

## ▶️ Run the Full System

```bash
chmod +x start.sh
./start.sh
```

---

## 🧠 What Happens When You Run It

The script launches **3 terminals automatically**:

### Database

* Starts PostgreSQL using Docker Compose
* Runs on: `localhost:5432`

### Backend

* Waits until DB is ready (`pg_isready`)
* Starts server:

```bash
npm run dev
```

* Runs on: **http://localhost:3001**

### Frontend

* Starts React app:

```bash
npm run dev
```

* Runs on: **http://localhost:5173**

---

## 🌐 Application URLs

| Service  | URL                   |
| -------- | --------------------- |
| Frontend | http://localhost:5173 |
| Backend  | http://localhost:3001 |
| Database | localhost:5432        |

---

## 🔐 Demo Login Credentials

| Role    | Email / User ID                                               | Password                                          |
| ------- | ------------------------------------------------------------- | ------------------------------------------------- |
| Owner   | [ramesh@sharmagarments.com](mailto:ramesh@sharmagarments.com) | Owner@123                                         |
| Manager | [mak650650@gmail.com](mailto:mak650650@gmail.com)             | [mak650650@gmail.com](mailto:mak650650@gmail.com) |
| Staff   | 9450946772 (Rahul Kumar)                                      | PIN-based login                                   |
| Staff   | 9876543213 (Priya Singh)                                      | PIN-based login                                   |
| Staff   | 9876543214 (Amit Yadav)                                       | PIN-based login                                   |

> ⚠️ Note: Data may be local/mock depending on setup.

---

## 🐞 Issue Tracking & Development Progress

* Issues tracked via **Git commits and Pull Requests**
* Development spanned **4 milestones (Feb–Apr 2026)**

### Highlights

* **Milestone 1** → Project setup & architecture
* **Milestone 2** → Frontend implementation
* **Milestone 3** → Backend integration + OpenAPI docs
* **Milestone 4** → Critical bug fixes (PR #6, #7)

### Key Fixes

* Inventory return errors
* Double-return prevention
* Reorder workflow fixes
* Dashboard date filtering
* JWT security hardening
* CORS & DB error leakage fixes
* GPS validation improvements
* Discount overflow handling

---

## 🛠️ Troubleshooting

### Check running containers

```bash
docker ps
```

### Kill port if busy

```bash
lsof -i :3001
kill -9 <PID>
```

### Install pg_isready

```bash
sudo apt install postgresql-client
```

---

## 📦 Stopping the System

```bash
docker compose down
```

---

## 🤝 Contribution Guidelines

* Use feature branches
* Write meaningful commit messages
* Submit Pull Requests for review

---

## ✅ Quick Start

```bash
./start.sh
```

Runs everything:

* Database ✅
* Backend ✅
* Frontend ✅
