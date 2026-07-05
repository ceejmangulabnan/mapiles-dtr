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
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY . /var/www/html

RUN composer install --no-dev --optimize-autoloader --no-interaction

RUN npm cache clean --force && \
    npm install --include=optional --platform=linux --arch=x64 && \
    npm run build


FROM php:8.3-fpm

RUN apt-get update && apt-get install -y \
    nginx \
    libpq-dev \
    libzip-dev \
    zip \
    curl \
    ca-certificates \
    && docker-php-ext-install pdo_pgsql zip \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /var/www/html

COPY --from=builder /var/www/html /var/www/html

RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache && \
    chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

COPY nginx.conf /etc/nginx/sites-enabled/default

EXPOSE 10000

COPY start.sh /start.sh
RUN chmod +x /start.sh

CMD ["/start.sh"]