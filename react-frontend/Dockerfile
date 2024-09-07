FROM node:16.17 as admin-build-stage
RUN echo "NODE Version:" && node --version
WORKDIR /app

COPY package*.json ./

RUN npm config set fetch-retry-maxtimeout 120000

RUN npm i --force

COPY . .

