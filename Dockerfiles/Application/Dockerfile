FROM node:10

WORKDIR /usr/src/app
COPY package*.json ./

# You're welcome to change this, but ci is essential to a reproducible build
# based on the current package-lock file. Keep in mind that only a clean working
# branch up to date with master will be guaranteed reproducible.
RUN npm ci

COPY ../.. .
RUN ["npm", "run", "build:dev"]

EXPOSE 8080
CMD ["node", "./dist/main.js"]
