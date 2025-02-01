import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { Ticket } from './entities/ticket.entity';
import { TicketPurchase } from './entities/ticket.purchase.entity';
import { TicketResale } from './entities/ticket.resale.entity';
import { Event } from '../event/entities/event.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ticket, TicketPurchase, TicketResale, Event]),
  ],
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}
