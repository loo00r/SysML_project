
PORT=${PORT:-8000}

echo "[◦] Starting FastAPI app on port $PORT..."
uvicorn app.main:app --host 0.0.0.0 --port $PORT --reload