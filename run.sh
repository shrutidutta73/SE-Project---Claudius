#!/usr/bin/env bash

ROOT="$(cd "$(dirname "$0")" && pwd)"

# Database
gnome-terminal --title="Database" -- bash -c "
  cd '$ROOT/backend'
  echo '==> Starting PostgreSQL via Docker Compose...'
  docker compose up
  exec bash
"

# Backend — poll port 5432 directly until postgres accepts connections
gnome-terminal --title="Backend" -- bash -c "
  cd '$ROOT/backend'
  echo '==> Waiting for PostgreSQL on port 5432...'
  until pg_isready -h localhost -p 5432 -U smallbiz -q 2>/dev/null; do
    sleep 1
  done
  echo '==> Database ready. Starting backend...'
  npm run dev
  exec bash
"

# Frontend
gnome-terminal --title="Frontend" -- bash -c "
  cd '$ROOT/frontend'
  echo '==> Starting frontend...'
  npm run dev
  exec bash
"

echo "Terminals launched:"
echo "  Database : PostgreSQL via docker compose (port 5432)"
echo "  Backend  : http://localhost:3001"
echo "  Frontend : http://localhost:5173"
