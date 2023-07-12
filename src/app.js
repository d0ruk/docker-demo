import "core-js/stable";
import os from "os";
import path from "path";

import Koa from "koa";
import mount from "koa-mount";
import getLogger from "koa-pino-logger";
import { createStream } from "rotating-file-stream";

import { name } from "../package.json";
import * as apps from "./mnt";
import createDB from "./db";
import { config } from "./index";

const HOSTNAME = os.hostname();
const stream = createStream(`${name}_${HOSTNAME}.log`, {
  interval: "1d",
  maxSize: "100M",
  path: path.resolve("logs"),
  size: "10M",
});
const logger = getLogger({ stream });
const app = new Koa();

if (config.redis_url) app.context.db = createDB(config, logger);
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

if (!module.children) {
  const PORT = config.port;
  app.listen(PORT);
  console.log(`Listening on ${PORT} in ${process.env.NODE_ENV}`); // eslint-disable-line
}

export default app;
