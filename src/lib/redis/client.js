import { Redis } from '@upstash/redis';

let redis;

/**
 * Singleton Upstash Redis client (REST-based, works in Edge/Serverless
 * runtimes without a persistent TCP connection).
 */
export function getRedisClient() {
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return redis;
}