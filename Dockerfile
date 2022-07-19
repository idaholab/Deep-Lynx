FROM node:16

# these settings are needed for the admin web gui build, these variables are all baked into the Vue application and thus
# are available to any end user that wants to dig deep enough in the webpage - as such we don't feel it a security risk
# to have these env variables available to anyone running the history commmand on the container/image
ENV VUE_APP_BUNDLED_BUILD="true"
ENV VUE_APP_DEEP_LYNX_API_URL="http://localhost:8090"
ENV VUE_APP_DEEP_LYNX_API_AUTH_METHOD="token"
ENV VUE_APP_TIME_SERIES_ENABLED="true"
# you must include the trailing /# - because the bundled admin web app will be in hash mode, not history
ENV VUE_APP_APP_URL="http://localhost:8090/#"
# this should be an alphanumeric random string of at least 15 characters
ENV VUE_APP_DEEP_LYNX_APP_ID="root"
ENV CORE_DB_CONNECTION_STRING=postgresql://postgres:root@timescaledb:5432/deep_lynx_dev

# Create the base directory and make user "node" the owner
RUN mkdir /srv/core_api && chown node:node /srv/core_api

WORKDIR /srv/core_api
COPY --chown=node:node package*.json ./

RUN apt update && apt upgrade -y
RUN npm update -g
RUN npm install pm2 -g

# Bundle app source
COPY --chown=node:node . .

# Build the app
RUN npm ci --include=dev
RUN npm run build:docker
RUN cd /srv/core_api/AdminWebApp && npm ci --include=dev && npm run build -- --dest /srv/core_api/dist/http_server/web_gui

USER root

# Add docker-compose-wait tool ----------------------
ADD https://github.com/ufoscout/docker-compose-wait/releases/download/2.7.3/wait /wait
RUN chmod +x /wait

EXPOSE 8090
CMD /wait && cd ./dist && pm2-runtime main.js
