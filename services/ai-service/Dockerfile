# ---------- BASE IMAGE ----------
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY . .

# Expose port (Render default is 10000)
ENV PORT=10000

# Run app (adjust if using FastAPI / Flask)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "10000"]