import redis from "../clients/redis.client.js";

export const setValue = async (key, value, expiry) => {
  const stringValue = JSON.stringify(value);
  if (expiry) {
    return redis.set(key, stringValue, "EX", expiry);
  }
  return redis.set(key, stringValue);
};

export const getValue = async (key) => {
  const value = await redis.get(key);
  if (value === null) return null;
  return JSON.parse(value);
};

export const deleteValue = async (key) => {
  return redis.del(key);
};
