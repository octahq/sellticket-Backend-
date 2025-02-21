import { ModuleMetadata, Type } from '@nestjs/common';
import { RedisOptions } from 'ioredis';

export interface RedisModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  useExisting?: Type<RedisOptionsFactory>;
  useClass?: Type<RedisOptionsFactory>;
  useFactory?: (...args: any[]) => Promise<RedisOptions> | RedisOptions;
  inject?: any[];
}

export interface RedisOptionsFactory {
  createRedisOptions(): Promise<RedisOptions> | RedisOptions;
}
