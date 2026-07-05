#!/usr/bin/env bash
set -e

echo "Running Laravel startup tasks..."

# Cache Laravel configs for performance
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Run migrations (ignore failure if DB not ready yet)
php artisan migrate --force --seed || echo "Migration skipped or failed"

# Render dynamically assigns a port via $PORT
sed -i "s/listen [0-9]*/listen ${PORT:-10000}/g" /etc/nginx/sites-enabled/default

# Start PHP-FPM in background
php-fpm -D

# Start Nginx in foreground
nginx -g 'daemon off;'
