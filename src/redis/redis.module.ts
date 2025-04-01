import { Module, DynamicModule, Provider } from '@nestjs/common';
import { RedisService } from './redis.service';
import { RedisModuleOptions } from './interfaces/redis-module-options.interface';
import { RedisModuleAsyncOptions } from './interfaces/redis-module-async-options.interface';
import { redisClientProvider } from './redis.providers';

@Module({
  providers: [redisClientProvider, RedisService],
  exports: [RedisService],
})
export class RedisModule {
  static register(options: RedisModuleOptions): DynamicModule {
    return {
      module: RedisModule,
      providers: [
        {
          provide: 'REDIS_OPTIONS',
          useValue: options,
        },
        redisClientProvider,
        RedisService,
      ],
      exports: [RedisService],
    };
  }

  static registerAsync(options: RedisModuleAsyncOptions): DynamicModule {
    return {
      module: RedisModule,
      imports: options.imports || [],
      providers: [
        ...this.createAsyncProviders(options),
        redisClientProvider,
        RedisService,
      ],
      exports: [RedisService],
    };
  }

  private static createAsyncProviders(
    options: RedisModuleAsyncOptions,
  ): Provider[] {
    if (options.useExisting) {
      return [
        {
          provide: 'REDIS_OPTIONS',
          useExisting: options.useExisting,
          inject: [options.useExisting],
        },
      ];
    }
    if (options.useFactory) {
      return [
        {
          provide: 'REDIS_OPTIONS',
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
      ];
    }
    return [
      {
        provide: 'REDIS_OPTIONS',
        useClass: options.useClass,
      },
    ];
  }
}
