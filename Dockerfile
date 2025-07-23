FROM rust:alpine:latest as build

ENV RUSTFLAGS="-C target-feature=-crt-static"
ENV RUN_MODE="build"
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

# turn off jobs on the main thread as this spins up PM2 with the worker
ENV RUN_JOBS=false
# set the default db to the one we'd see in the docker compose
ENV CORE_DB_CONNECTION_STRING=postgresql://postgres:root@postgres:5432/deep_lynx_dev

RUN apk update
RUN apk add --no-cache build-base musl-dev openssl openssl-dev
RUN apk update add --update nodejs=21.7.3
RUN apk add --update npm
RUN npm config set strict-ssl false
# Install corepack separately so it is found during builds.
RUN npm install -g corepack @napi-rs/cli # this is needed for the Rust/Node library interopt
RUN npm install npm@latest --location=global
RUN npm update --location=global
RUN npm install cargo-cp-artifact --location=global
RUN corepack enable # enables the yarn commands

RUN mkdir -p /srv/deeplynx
WORKDIR /srv/deeplynx

# Must be specific for dedicated agent pool to find files
COPY /Deep-Lynx /srv/deeplynx

# triple check we're not pulling in node_modules from the host system
RUN rm -rf /srv/deeplynx/server/node_modules
RUN rm -rf /srv/deeplynx/ui/AdminWebApp/node_modules
RUN rm -rf /srv/deeplynx/ui/WebGLViewer/node_modules

WORKDIR /srv/deeplynx/server
RUN yarn install;
RUN yarn run build;

FROM node:alpine:latest as production
ENV DEVELOPMENT_MODE=false

RUN apk update && apk add --no-cache supervisor openssl
RUN mkdir -p /srv/deeplynx/server

# need pm2 to run legacy server
RUN npm install npm@latest --location=global
RUN npm update --location=global
RUN npm install pm2 --location=global

COPY --from=build /srv/deeplynx/server /srv/deeplynx/server
COPY Deep-Lynx/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

EXPOSE 8090
CMD /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
