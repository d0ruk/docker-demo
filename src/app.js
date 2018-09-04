import "@babel/polyfill";

import os from "os";
import path from "path";

import Koa from "koa";
import mount from "koa-mount";
import getLogger from "koa-pino-logger";
import redis from "redis";
import { promisifyAll } from "bluebird";
import RFS from "rotating-file-stream";

import { name } from "../package.json";
import * as apps from "./mnt";

promisifyAll(redis.RedisClient.prototype);
promisifyAll(redis.Multi.prototype);

const isProd = process.env.NODE_ENV === "production";
if (!isProd) redis.debug_mode = true;

const HOSTNAME = os.hostname();
const ONE_HOUR = 1000 * 60 * 60;
const MAX_ATTEMPTS = 5 * isProd ? 100 : 1;

const rfs = new RFS(`${name}_${HOSTNAME}.log`, {
  // compress: "gzip",
  interval: "1d",
  maxSize: "100M",
  path: path.resolve("logs"),
  size: "10M",
});
const logger = getLogger({ stream: rfs });
const db = redis.
  createClient({
    host: "redis",
    retry_strategy: ({
      attempt,
      total_retry_time, // total ms spent trying to reconnect
      error,
      // times_connected
    } = {}) => {
      if (error && error.code === "ECONNREFUSED")
        return new Error("Connection refused.");

      if (total_retry_time > ONE_HOUR) return new Error("Retry time exhausted");

      if (attempt > MAX_ATTEMPTS) return undefined;

      return Math.min(attempt * 100, 3000);
    },
  }).
  on("error", logger.logger.error);

const app = new Koa();
app.context.db = db;
app.use(logger);
app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  ctx.set("X-Response-Time", `${ms}ms`);
  ctx.log.info(`${ctx.method} ${ctx.url} - ${ms}ms`);
});

for (const [route, subapp] of Object.entries(apps))
  app.use(mount(`/${route}`, subapp()));

app.use(ctx => {
  ctx.body = `host: ${HOSTNAME}\n`;
});

if (!module.parent) {
  const port = process.env.PORT || 11111;
  app.listen(port);
  console.log(`Listening on ${port}`); // eslint-disable-line
}

export default app;
