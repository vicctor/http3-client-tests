#!/bin/bash

# 🌌 Start Cosmic JDD Conference HTTP/3 & QUIC Presentation
# Based on presentation-plan.md with cosmic/sci-fi atmospheric theme

echo "🌌 Starting Cosmic JDD Conference HTTP/3 & QUIC Presentation..."
echo ""
echo "✨ Cosmic Theme Features:"
echo "  • 🌌 Deep space atmospheric background with cosmic gradients"
echo "  • 🎆 Fuchsia/cyan cosmic color palette with glow effects"
echo "  • 📱 Compact layout optimized for screen presentations"
echo "  • 🔮 Atmospheric blur and cosmic text shadows"
echo "  • ☕ Java ecosystem focus (Spring Boot, Netty, JDK 26)"
echo ""
echo "🌐 The presentation will be available at:"
echo "  http://localhost:8080"
echo ""
echo "🎮 Navigation:"
echo "  Arrow keys: Navigate slides"
echo "  Space: Next slide"
echo "  Shift+Space: Previous slide"
echo "  Esc: Overview mode"
echo "  F: Fullscreen"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the presentation
echo "🚀 Launching cosmic JDD Conference presentation..."
npm start