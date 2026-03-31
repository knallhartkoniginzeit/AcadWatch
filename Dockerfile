# --- Stage 1: Build React Frontend ---
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

# Pass REACT_APP_API_URL as empty so it uses relative paths in production
ENV REACT_APP_API_URL=""
COPY frontend/ .
RUN npm run build

# --- Stage 2: Serve with FastAPI backend ---
FROM python:3.10-slim
WORKDIR /app

# Install dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy FastAPI app
COPY backend/ .

# Copy the built React app from Stage 1 into the backend's static directory
COPY --from=frontend-builder /app/frontend/build ./static

# Railway provides PORT, default to 8000 locally
ENV PORT=8000
# EXCEL_PATH can be mapped to a Railway persistent volume later
ENV EXCEL_PATH="./acadwatch_data.xlsx"

EXPOSE ${PORT}

# Run the app. Uses dynamic port from Railway.
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT}
