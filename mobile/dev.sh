#!/bin/bash

# Check if node_modules folder does NOT exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

echo "Starting Mobile App..."
npx expo start --tunnel -c