import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { EventModule } from './modules/event/event.module';
import { CategoryModule } from './modules/category/category.module';
import { CloudinaryProvider } from './modules/cloudinary/cloudinary.provider';
import { PaymentModule } from './modules/payment/payment.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { TicketPurchaseModule } from './modules/ticket-purchase/ticket-purchase.module';
import { QueueModule } from './modules/queue/queue.module';
import { WalletModule } from './modules/wallet/wallet.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    AuthModule,
    EventModule,
    CategoryModule,
    PaymentModule,
    TicketsModule,
    TicketPurchaseModule,
    QueueModule,
    WalletModule,
  ],
  controllers: [AppController],
  providers: [AppService, CloudinaryProvider],
  exports: [CloudinaryProvider],
})
export class AppModule {}
