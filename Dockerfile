FROM rust:alpine3.19 as build

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
RUN apk add build-base musl-dev openssl-dev
RUN apk update add --update nodejs=21.7.3
RUN apk add --update npm
RUN npm config set strict-ssl false
RUN npm install -g @napi-rs/cli # this is needed for the Rust/Node library interopt
RUN npm install npm@latest --location=global
RUN npm update --location=global
RUN npm install cargo-cp-artifact --location=global
RUN corepack enable # enables the yarn commands

RUN mkdir -p /srv/deeplynx
WORKDIR /srv/deeplynx

COPY . .

# triple check we're not pulling in node_modules from the host system
RUN rm -rf /srv/deeplynx/server/legacy/node_modules
RUN rm -rf /srv/deeplynx/ui/AdminWebApp/node_modules
RUN rm -rf /srv/deeplynx/ui/WebGLViewer/node_modules

WORKDIR /srv/deeplynx/server/deeplynx
RUN cargo install --path .

FROM node:alpine3.19 as production
ENV DEVELOPMENT_MODE=false

RUN apk update && apk add supervisor
RUN mkdir -p /srv/deeplynx/server/legacy

# need pm2 to run legacy server
RUN npm install npm@latest --location=global
RUN npm update --location=global
RUN npm install pm2 --location=global

COPY --from=build /srv/deeplynx/server/legacy /srv/deeplynx/server/legacy
COPY --from=build /usr/local/cargo/bin/deeplynx /usr/local/bin/deeplynx
COPY --from=build /srv/deeplynx/server/deeplynx/configs /configs
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

EXPOSE 8090
EXPOSE 4000
CMD /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
