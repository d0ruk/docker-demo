FROM node:lts as builder

WORKDIR /usr/src/app

COPY ./package.json .
RUN curl --compressed -o- -L https://yarnpkg.com/install.sh | bash
RUN yarn

###############

FROM node:lts-alpine

RUN set -eux; \
  apk add --no-cache tini

WORKDIR /usr/src/app

COPY src ./src
COPY --from=builder /usr/src/app .

ENV PATH /usr/src/app/node_modules/.bin:$PATH
EXPOSE 8080
ENTRYPOINT ["/sbin/tini", "--"]
