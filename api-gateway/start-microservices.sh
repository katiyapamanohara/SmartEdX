#!/bin/bash

# Quick Start Script for Microservices Gateway
# This script helps you quickly test the API Gateway with mock services

set -e

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║   API Gateway - Microservices Architecture Setup        ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Function to wait for service
wait_for_service() {
    local url=$1
    local service=$2
    local max_attempts=30
    local attempt=0

    echo "⏳ Waiting for $service..."
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            echo "✅ $service is ready!"
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 1
    done
    
    echo "⚠️  $service is not responding (timeout)"
    return 1
}

echo "🚀 Starting services with Docker Compose..."
echo ""

# Check which compose file to use
if [ -f "docker-compose.microservices.yaml" ]; then
    COMPOSE_FILE="docker-compose.microservices.yaml"
    echo "Using docker-compose.microservices.yaml"
else
    COMPOSE_FILE="docker-compose.yaml"
    echo "Using docker-compose.yaml"
fi

# Start services
docker compose -f "$COMPOSE_FILE" up -d --build

echo ""
echo "📊 Services Status:"
docker compose -f "$COMPOSE_FILE" ps
echo ""

# Wait for services to be ready
wait_for_service "http://localhost:3000/gateway/health" "API Gateway"
wait_for_service "http://localhost:4001/health" "Quiz Service"

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                  🎉 Setup Complete!                      ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "📍 Available Services:"
echo "  • API Gateway:     http://localhost:3000"
echo "  • Swagger Docs:    http://localhost:3000/docs"
echo "  • Quiz Service:    http://localhost:4001"
echo "  • Adminer (DB):    http://localhost:8080"
echo "  • Maildev:         http://localhost:1080"
echo ""
echo "🔍 Quick Health Check:"
curl -s http://localhost:3000/gateway/services/health | jq '.' 2>/dev/null || curl -s http://localhost:3000/gateway/services/health
echo ""
echo ""
echo "🧪 Test Commands:"
echo "  # Get all quizzes"
echo "  curl http://localhost:3000/quiz/quizzes"
echo ""
echo "  # Create a quiz"
echo "  curl -X POST http://localhost:3000/quiz/quizzes \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"title\":\"My Quiz\",\"difficulty\":\"easy\"}'"
echo ""
echo "  # Check service health"
echo "  curl http://localhost:3000/gateway/services/health"
echo ""
echo "📚 Documentation:"
echo "  • Architecture:  cat GATEWAY_README.md"
echo "  • Testing Guide: cat TESTING_GUIDE.md"
echo "  • Summary:       cat MICROSERVICES_SUMMARY.md"
echo ""
echo "🛑 To stop services:"
echo "  docker compose -f $COMPOSE_FILE down"
echo ""
echo "📝 View logs:"
echo "  docker compose -f $COMPOSE_FILE logs -f"
echo ""
