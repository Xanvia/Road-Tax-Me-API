#!/bin/bash

# Road Tax Me - Quick Start Script
# This script sets up and starts the development environment

set -e

echo "🚀 Road Tax Me API - Quick Start"
echo "=================================="
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📋 Creating .env file from example..."
    cp .env.example .env
    echo "✅ .env file created. Please update it with your actual values."
    echo ""
    echo "⚠️  Important values to update in .env:"
    echo "   - DB_PASSWORD (PostgreSQL password)"
    echo "   - JWT_SECRET (secure token secret)"
    echo "   - DVLA_API_KEY (DVLA API key)"
    echo "   - STRIPE_SECRET_KEY (Stripe API key)"
    echo ""
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo "✅ Dependencies installed"
    echo ""
fi

# Check if dist exists
if [ ! -d "dist" ]; then
    echo "🔨 Building TypeScript..."
    npm run build
    echo "✅ Build complete"
    echo ""
fi

echo "🎯 Setup Complete!"
echo ""
echo "Choose how to start:"
echo ""
echo "Option 1 - Docker (Recommended for first time)"
echo "  docker-compose up -d"
echo "  Then visit: http://localhost:3000/health"
echo ""
echo "Option 2 - Development Mode (requires local PostgreSQL)"
echo "  npm run dev"
echo "  Server will start on http://localhost:3000"
echo ""
echo "Option 3 - Production Mode"
echo "  npm run start"
echo ""
echo "For more information, see:"
echo "  - README.md for full documentation"
echo "  - SETUP_COMPLETE.md for detailed setup guide"
echo "  - scripts/init.md for architecture details"
echo ""
