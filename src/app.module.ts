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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RedisModule.forRoot({
      type: 'single',
      url: 'redis://localhost:6379',
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
  providers: [CloudinaryProvider],
  exports: [CloudinaryProvider],
})
export class AppModule {}

