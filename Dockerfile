FROM node:carbon

COPY package.json /home/node/app/
RUN mkdir -p /home/node/app/src
COPY src/ /home/node/app/src/

WORKDIR /home/node/app
RUN npm i

ENV PORT 3001
# EXPOSE 3001
