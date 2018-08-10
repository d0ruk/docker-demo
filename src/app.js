import "@babel/polyfill";

import path from "path";
import os from "os";
import Koa from "koa";
import logger from "koa-pino-logger";
// import redis from "redis";

const app = new Koa();
// const db = redis.createClient();

app.use(logger());

app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  ctx.set("X-Response-Time", `${ms}ms`);
});

app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  ctx.log.warn(`${ctx.method} ${ctx.url} - ${ms}`);
});

app.use(async (ctx, next) => {
  ctx.body = `host: ${await os.hostname()}\n`;  });

if (!module.parent) {
  const port = process.env.PORT || 11111;
  app.listen(port);
  console.log(`Listening on ${port}`);
}

export default app;
