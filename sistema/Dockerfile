FROM php:8.2-apache

# Instalar extensões PostgreSQL e habilitar módulos Apache
RUN apt-get update && apt-get install -y libpq-dev \
    && docker-php-ext-install pdo pdo_pgsql \
    && a2enmod rewrite headers \
    && rm -rf /var/lib/apt/lists/*

# Configurar AllowOverride para .htaccess funcionar
RUN sed -i 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf

# Copiar arquivos da API (o build context já é a pasta 'sistema/')
COPY api/ /var/www/html/api/

# Permissões corretas
RUN chown -R www-data:www-data /var/www/html

EXPOSE 80
CMD ["apache2-foreground"]
