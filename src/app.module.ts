import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { databaseConfig } from './config/db.config';
import { EventModule } from './modules/event/event.module';
import { CategoryModule } from './modules/category/category.module';
import { CloudinaryProvider } from './modules/cloudinary/cloudinary.provider';
import { TicketsModule } from './modules/tickets/tickets.module';
import { TicketPurchaseModule } from './modules/ticket-purchase/ticket-purchase.module';
import { RedisModule } from '@nestjs-modules/ioredis';
import config from './config/env.config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Rate limiting configuration
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: 60,
          limit: 10,
          ignoreUserAgents: [/^postman/i],
        },
      ],
    }),
    RedisModule.forRoot({
      type: 'single',
      url: config.redis,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        databaseConfig(configService),
    }),
    EventModule,
    CategoryModule,
    TicketsModule,
    TicketPurchaseModule,
  ],
  providers: [
    CloudinaryProvider,
    // Apply rate limiting globally
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  exports: [CloudinaryProvider],
})
export class AppModule {}
