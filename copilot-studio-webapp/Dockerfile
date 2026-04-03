# ============================================================
# Stage 1 — Build the Next.js frontend as a static export
# ============================================================
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --prefer-offline

COPY frontend/ ./

# At build time the API is same-origin, so no explicit URL needed
ENV NEXT_PUBLIC_API_URL=""

RUN npm run build

# ============================================================
# Stage 2 — Python runtime with the static frontend baked in
# ============================================================
FROM python:3.12-slim

WORKDIR /app

# Install Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY app.py start_server.py ./

# Copy the Next.js static export into /app/static
COPY --from=frontend-build /app/frontend/out ./static

# Azure Container Apps injects PORT (default 8080)
ENV PORT=8080
EXPOSE 8080

CMD ["python", "app.py"]
