import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketPurchaseService } from './ticket-purchase.service';
import { TicketPurchaseController } from './ticket-purchase.controller';
import { Ticket } from '../tickets/entities/ticket.entity';
import { TicketPurchase } from './entities/ticket.purchase.entity';
import { TicketResale } from './entities/ticket.resale.entity';
@Module({
  imports: [TypeOrmModule.forFeature([Ticket, TicketPurchase, TicketResale])],
  controllers: [TicketPurchaseController],
  providers: [TicketPurchaseService],
  exports: [TicketPurchaseService],
})
export class TicketPurchaseModule {}
