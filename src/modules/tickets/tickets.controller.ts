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
import { CreateTicketDto } from './dto';
import { Ticket } from './entities/ticket.entity';
import { ServiceResponse } from './interface/ticket.response';
import { TicketResponseDto } from './dto/ticket-response.dto';
import { TicketsListResponseDto } from './dto/TicketsListResponseDto';

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
    type: TicketResponseDto,
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
  ): Promise<ServiceResponse<Ticket>> {
    return this.ticketsService.createTicket(createTicketDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tickets' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns all tickets',
    type: TicketsListResponseDto,
  })
  async findAllTickets(): Promise<ServiceResponse<Ticket[]>> {
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
    type: TicketResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Ticket not found',
  })
  async findTicketById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ServiceResponse<Ticket>> {
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
    type: TicketsListResponseDto,
  })
  async findTicketsByEvent(
    @Param('eventId', ParseIntPipe) eventId: number,
  ): Promise<ServiceResponse<Ticket[]>> {
    return this.ticketsService.findTicketsByEvent(eventId);
  }
}
