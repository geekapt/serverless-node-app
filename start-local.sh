#!/bin/bash

# Start the backend and database with Docker Compose
echo "Starting backend and database with Docker Compose..."
cd $(dirname "$0")
docker compose up -d

# Wait for the backend to be ready
echo "Waiting for backend to be ready..."
until curl -s http://localhost:3001/health >/dev/null; do
  echo "Waiting for backend to be ready..."
  sleep 2
done

echo "Backend is ready!"

# Start the frontend
echo "Starting frontend..."
cd frontend
npm start

# Cleanup on exit
trap "cd .. && docker compose down" EXIT
