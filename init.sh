#!/bin/sh
set -e

APP_DIR=/app
DATA_DIR="$APP_DIR/public/data"
UPLOAD_DIR="$APP_DIR/public/uploads"
IMG_DIR="$UPLOAD_DIR/images"
VID_DIR="$UPLOAD_DIR/videos"
DOC_DIR="$UPLOAD_DIR/docs"

# Ensure directories exist
mkdir -p "$DATA_DIR" "$IMG_DIR" "$VID_DIR" "$DOC_DIR"

# Fix ownership for mounted volumes so the node user can write
chown -R node:node "$DATA_DIR" "$UPLOAD_DIR" || true

# Drop privileges to node user for the app
exec su-exec node:node node server.js
