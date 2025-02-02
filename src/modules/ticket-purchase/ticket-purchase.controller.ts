import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  ParseUUIDPipe,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TicketPurchaseService } from './ticket-purchase.service';
import { CreateTicketPurchaseDto, CreateTicketResaleDto } from './dto';
import { TicketPurchase } from './entities/ticket.purchase.entity';
import { TicketResale } from './entities/ticket.resale.entity';
import { ServiceResponse } from '../tickets/interface/ticket.response';

@ApiTags('Ticket Purchases')
@ApiBearerAuth()
@Controller('ticket-purchases')
export class TicketPurchaseController {
  constructor(private readonly ticketPurchaseService: TicketPurchaseService) {}

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
  ): Promise<ServiceResponse<TicketPurchase>> {
    return this.ticketPurchaseService.purchaseTicket(createTicketPurchaseDto);
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
  ): Promise<ServiceResponse<TicketResale>> {
    return this.ticketPurchaseService.resellTicket(createTicketResaleDto);
  }

  @Get('validate/:ticketId')
  @ApiOperation({ summary: 'Validate a ticket' })
  @ApiParam({
    name: 'ticketId',
    description: 'UUID of the ticket to validate',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns ticket validation status',
    type: Boolean,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Ticket not found',
  })
  async validateTicket(
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
  ): Promise<ServiceResponse<boolean>> {
    return this.ticketPurchaseService.validateTicket(ticketId);
  }

  //   @Get('user/:userId')
  //   @ApiOperation({ summary: "Get user's tickets" })
  //   @ApiParam({
  //     name: 'userId',
  //     description: 'ID of the user',
  //     type: String,
  //   })
  //   @ApiResponse({
  //     status: HttpStatus.OK,
  //     description: "Returns user's tickets",
  //     type: [TicketPurchase],
  //   })
  //   async getUserTickets(
  //     @Param('userId') userId: string,
  //   ): Promise<ServiceResponse<TicketPurchase[]>> {
  //     return this.ticketPurchaseService.getUserTickets(userId);
  //   }
}
