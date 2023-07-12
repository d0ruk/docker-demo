import redis from "redis";
import { promisifyAll } from "bluebird";
import { config } from "./index";

const isProd = config.isProd
const ONE_HOUR = 1000 * 60 * 60;
const MAX_ATTEMPTS = 5 * isProd ? 100 : 1;

if (!isProd) redis.debug_mode = true;
promisifyAll(redis.RedisClient.prototype);
promisifyAll(redis.Multi.prototype);

export default (config, logger) => {
  return redis
    .createClient({
      url: config.redis_url,
      retry_strategy: ({
        attempt,
        total_retry_time, // total ms spent trying to reconnect
        error,
        // times_connected
      } = {}) => {
        if (error && error.code === "ECONNREFUSED")
          return new Error("Connection refused.");

        if (total_retry_time > ONE_HOUR)
          return new Error("Retry time exhausted");

        if (attempt > MAX_ATTEMPTS) return undefined;

        return Math.min(attempt * 100, 3000);
      },
    })
    .on("error", logger.logger.error);
};
