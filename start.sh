#!/usr/bin/env bash
set -e

echo "Running Laravel startup tasks..."

php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan migrate --force