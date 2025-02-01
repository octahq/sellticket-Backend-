import { Controller } from '@nestjs/common';
import { TicketsService } from './tickets.service';

@Controller('tickets')
export class TicketsController {
    constructor(private readonly ticketsService: TicketsService) {}

    // HTTP handlers for ticket operations will be added here
} 