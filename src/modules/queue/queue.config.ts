import { RedisOptions } from "bullmq";
import Redis from "ioredis";
import { ConfigService } from "@nestjs/config";

const configService = new ConfigService();

export const redisConnection: RedisOptions = {
  host: configService.get<string>("REDIS_HOST"),
  port: configService.get<number>("REDIS_PORT"),
  password: configService.get<string>("REDIS_PASSWORD"),
  tls: {},
  maxRetriesPerRequest: null,
};

// Create a reusable Redis client instance only when Redis is used
export const redisClient = new Redis({
  host: redisConnection.host,
  port: redisConnection.port,
  password: redisConnection.password,
  tls: redisConnection.tls,
});
