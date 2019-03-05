FROM node:carbon-slim

RUN mkdir -p /home/node/app/src
COPY package.json /home/node/app/
COPY src/ /home/node/app/src/

WORKDIR /home/node/app
RUN npm i -g yarn
RUN yarn

ENV PORT 3001
ENV PATH /home/node/app/src/node_modules/.bin:$PATH
