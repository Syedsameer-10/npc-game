#!/usr/bin/env bash
# =========================================================================
# Render Production Build Script
# Builds both the React/Vite Frontend and installs Python Backend
# =========================================================================

set -o errexit

echo "==> [1/3] Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "==> [2/3] Installing Frontend dependencies..."
cd frontend
npm ci || npm install

echo "==> [3/3] Compiling Production Frontend Assets (Vite)..."
npm run build
cd ..

echo "==> Build complete! Frontend artifacts verified at frontend/dist/"
