import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  ParseIntPipe,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import {
  CreateTicketDto,
  CreateTicketPurchaseDto,
  CreateTicketResaleDto,
} from './dto';
import { Ticket } from './entities/ticket.entity';
import { TicketPurchase } from './entities/ticket.purchase.entity';
import { TicketResale } from './entities/ticket.resale.entity';

@ApiTags('Tickets')
@ApiBearerAuth()
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new ticket for an event' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Ticket has been successfully created',
    type: Ticket,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid ticket data provided',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Event not found',
  })
  async createTicket(
    @Body() createTicketDto: CreateTicketDto,
  ): Promise<Ticket> {
    return this.ticketsService.createTicket(createTicketDto);
  }

  @Post('purchase')
  @ApiOperation({ summary: 'Purchase tickets' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Tickets have been successfully purchased',
    type: TicketPurchase,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid purchase data or insufficient tickets',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Ticket not found',
  })
  async purchaseTicket(
    @Body() createTicketPurchaseDto: CreateTicketPurchaseDto,
  ): Promise<TicketPurchase> {
    return this.ticketsService.purchaseTicket(createTicketPurchaseDto);
  }

  @Post('resale')
  @ApiOperation({ summary: 'List a ticket for resale' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Ticket has been successfully listed for resale',
    type: TicketResale,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid resale data or resale not allowed',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Ticket not found',
  })
  async createTicketResale(
    @Body() createTicketResaleDto: CreateTicketResaleDto,
  ): Promise<TicketResale> {
    return this.ticketsService.createTicketResale(createTicketResaleDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tickets' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns all tickets',
    type: [Ticket],
  })
  async findAllTickets(): Promise<Ticket[]> {
    return this.ticketsService.findAllTickets();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a ticket by ID' })
  @ApiParam({
    name: 'id',
    description: 'UUID of the ticket',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the ticket',
    type: Ticket,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Ticket not found',
  })
  async findTicketById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Ticket> {
    return this.ticketsService.findTicketById(id);
  }

  @Get('event/:eventId')
  @ApiOperation({ summary: 'Get all tickets for an event' })
  @ApiParam({
    name: 'eventId',
    description: 'ID of the event',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns all tickets for the event',
    type: [Ticket],
  })
  async findTicketsByEvent(
    @Param('eventId', ParseIntPipe) eventId: number,
  ): Promise<Ticket[]> {
    return this.ticketsService.findTicketsByEvent(eventId);
  }
}
