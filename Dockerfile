FROM node:12-alpine

RUN mkdir -p /home/node/app/src
WORKDIR /home/node/app
COPY package.json .
COPY src ./src

RUN npm i -g yarn
RUN yarn

ENV PATH /home/node/app/src/node_modules/.bin:$PATH
