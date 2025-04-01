import { Provider } from '@nestjs/common';
import Redis from 'ioredis';
import { RedisModuleOptions } from './interfaces/redis-module-options.interface';

export const redisOptionsProvider = (
  options: RedisModuleOptions,
): Provider => ({
  provide: 'REDIS_OPTIONS',
  useValue: options,
});

export const redisClientProvider: Provider = {
  provide: 'REDIS_CLIENT',
  useFactory: (options: RedisModuleOptions) => {
    const client = new Redis(options);
    client.on('error', (err) => {
      console.error('Redis connection error:', err);
    });
    return client;
  },
  inject: ['REDIS_OPTIONS'],
};

export const createRedisClient = async (options: RedisModuleOptions) => {
  const client = new Redis(options);
  return client;
};
