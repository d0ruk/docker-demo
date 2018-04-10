FROM node:carbon

WORKDIR /app
COPY package.json app.js index.js /app/
RUN npm i
ENV PORT 3001