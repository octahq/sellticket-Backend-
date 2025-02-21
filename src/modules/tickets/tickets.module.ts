import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { Ticket } from './entities/ticket.entity';
import { Event } from '../event/entities/event.entity';
import { TicketResaleHistory } from '../ticket-purchase/entities/ticket.resale.history.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Ticket, Event, TicketResaleHistory])],
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}
