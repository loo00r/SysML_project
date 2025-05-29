PORT=${PORT:-8000}

# Create pgvector extension if it doesn't exist
echo "[◦] Ensuring pgvector extension is installed..."
PGPASSWORD=postgres psql -h db -U postgres -d postgres -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Check if extension was created successfully
PGPASSWORD=postgres psql -h db -U postgres -d postgres -c "SELECT * FROM pg_extension WHERE extname = 'vector';"

echo "[◦] Starting FastAPI app on port $PORT..."
uvicorn app.main:app --host 0.0.0.0 --port $PORT --reload