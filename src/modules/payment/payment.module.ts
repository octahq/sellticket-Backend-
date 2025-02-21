import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { Transaction } from './entities/transaction.entity';
import { PaymentWebhookController } from './payment-webhook.controller';
import { HttpModule } from '@nestjs/axios';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { RedisModule } from '../../redis/redis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Transaction]),
    HttpModule,
    EventEmitterModule.forRoot(),
    RedisModule.register({
      host: 'localhost',
      port: 6379,
    }),
  ],
  controllers: [PaymentWebhookController],
  providers: [PaymentService, ConfigService],
  exports: [PaymentService],
})
export class PaymentModule {}
