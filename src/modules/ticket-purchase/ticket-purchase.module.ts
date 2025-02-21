import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketPurchaseService } from './ticket-purchase.service';
import { TicketPurchaseController } from './ticket-purchase.controller';
import { Ticket } from '../tickets/entities/ticket.entity';
import { TicketPurchase } from './entities/ticket.purchase.entity';
import { TicketResale } from './entities/ticket.resale.entity';
import { TicketResaleHistory } from './entities/ticket.resale.history.entity';
import { RedisModule } from '../../redis/redis.module';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Ticket,
      TicketPurchase,
      TicketResale,
      TicketResaleHistory,
    ]),
    RedisModule.register({
      host: 'localhost',
      port: 6379,
    }),
    PaymentModule,
  ],
  controllers: [TicketPurchaseController],
  providers: [TicketPurchaseService],
  exports: [TicketPurchaseService],
})
export class TicketPurchaseModule {}
