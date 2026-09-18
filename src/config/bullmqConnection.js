import IORedis from "ioredis";

export const bullMqConnection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
});
