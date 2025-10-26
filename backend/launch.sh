#!/usr/bin/env bash
set -euo pipefail

PORT=${PORT:-8000}
DB_HOST=${DB_HOST:-db}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-postgres}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-postgres}

echo "[◦] Waiting for PostgreSQL at ${DB_HOST}:${DB_PORT}/${DB_NAME}..."
until PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" -c "SELECT 1" >/dev/null 2>&1; do
  echo "    ↳ database still starting up, retrying in 2s..."
  sleep 2
done

echo "[◦] Ensuring pgvector extension is installed..."
PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" -c "CREATE EXTENSION IF NOT EXISTS vector;"

echo "[◦] Starting FastAPI app on port ${PORT}..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT}"
