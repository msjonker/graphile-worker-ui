#!/bin/bash
set -e

echo "🚀 Starting Graphile Worker UI in development mode..."

# Check if root .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found. Copying from .env.example..."
    cp .env.example .env
fi

# Install dependencies if node_modules don't exist
if [ ! -d "backend/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd backend && npm install && cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

echo "🔧 Starting services..."

# Start backend in background
echo "🖥️  Starting backend on port 5001..."
cd backend && npm run dev &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend
echo "🌐 Starting frontend on port 3001..."
cd frontend && npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Graphile Worker UI is running!"
echo "📊 Backend (GraphQL): http://localhost:5001/graphql"
echo "🔍 GraphiQL: http://localhost:5001/graphiql"
echo "🌐 Frontend: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop all services"

# Function to cleanup processes
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for processes
wait
