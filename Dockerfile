FROM php:8.3-cli AS builder

RUN apt-get update && apt-get install -y \
    curl \
    git \
    unzip \
    gnupg \
    ca-certificates \
    libpq-dev \
    libzip-dev \
    zip \
    && docker-php-ext-install pdo_pgsql zip \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY . /var/www/html

RUN composer install --no-dev --optimize-autoloader --no-interaction
RUN npm install
RUN npm run build


FROM php:8.3-fpm

RUN apt-get update && apt-get install -y \
    nginx \
    libpq-dev \
    libzip-dev \
    zip \
    curl \
    gnupg \
    ca-certificates \
    && docker-php-ext-install pdo_pgsql zip \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /var/www/html

# Copy built applications from builder stage
COPY --from=builder /var/www/html /var/www/html

# Ensure permissions are correct for Laravel
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache || true \
    && chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache || true

# Copy your Nginx configuration directly to sites-enabled to avoid symlink/activation issues
COPY nginx.conf /etc/nginx/sites-enabled/default

# Render dynamically assigns a port using the $PORT environment variable
EXPOSE 10000

CMD sh -c "php artisan config:cache && \
php artisan route:cache && \
php artisan view:cache && \
php artisan migrate --force --seed || echo 'Migration skipped (no database)' && \
sed -i \"s/listen [0-9]*/listen \${PORT:-10000}/g\" /etc/nginx/sites-enabled/default && \
php-fpm -D && \
nginx -g 'daemon off;'"