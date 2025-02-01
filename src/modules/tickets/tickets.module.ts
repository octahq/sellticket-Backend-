import { Module } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from './entities/ticket.entity';
import { TicketsController } from './tickets.controller';
import { TicketResale } from './entities/ticket.resale.entity';
import { TicketPurchase } from './entities/ticket.purchase.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Ticket, TicketResale, TicketPurchase])],
  controllers: [TicketsController],
  providers: [TicketsService],
})
export class TicketsModule {}
