#!/bin/sh

echo "[◦] Running Alembic migrations..."
if poetry run alembic -c ./alembic/alembic.ini upgrade head; then
    echo "[✓] Alembic migrations completed successfully"
else
    echo "[✗] Alembic migrations failed"
    exit 1
fi

PORT=${PORT:-8000}

echo "[◦] Starting FastAPI app on port $PORT..."
uvicorn app.main:app --host 0.0.0.0 --port $PORT --reload