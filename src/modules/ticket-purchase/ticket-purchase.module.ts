import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketPurchaseService } from './ticket-purchase.service';
import { TicketPurchaseController } from './ticket-purchase.controller';
import { TicketPurchase } from './entities/ticket-purchase.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { RedisModule } from '../redis/redis.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TicketPurchase, Ticket]),
    RedisModule,
    WalletModule,
  ],
  controllers: [TicketPurchaseController],
  providers: [TicketPurchaseService],
  exports: [TicketPurchaseService],
})
export class TicketPurchaseModule {}
