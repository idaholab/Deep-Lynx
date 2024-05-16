FROM node:lts-alpine

# Add nginx, nodejs and create folders 
RUN apk add --update nginx nodejs ; mkdir -p /tmp/nginx/vue-single-page-app ; mkdir -p /var/log/nginx ; mkdir -p /var/www/html

# Copy the respective nginx configuration files
COPY nginx_config/nginx.conf /etc/nginx/nginx.conf
COPY nginx_config/default.conf /etc/nginx/conf.d/default.conf

# Set the directory we want to run the next commands for
WORKDIR /tmp/nginx/vue-single-page-app
# Copy our source code into the container
COPY . .

# start nginx and keep the process from backgrounding and the container from quitting
CMD ["nginx", "-g", "daemon off;"]