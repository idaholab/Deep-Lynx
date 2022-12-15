FROM rust:slim-buster

RUN mkdir /srv/loader

WORKDIR /srv/loader
COPY . ./

RUN apt-get update
RUN apt-get install -y pkg-config
RUN apt-get install -y openssl
RUN apt-get install -y libssl-dev

# Build the app
RUN rustup default nightly
RUN cargo build --bin RedisLoader --release

USER root

# Add docker-compose-wait tool ----------------------
ADD https://github.com/ufoscout/docker-compose-wait/releases/download/2.9.0/wait /wait
RUN chmod +x /wait

CMD /wait && ./target/release/RedisLoader
