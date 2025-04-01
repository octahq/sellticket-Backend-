import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  ParseUUIDPipe,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TicketPurchaseService } from './ticket-purchase.service';
import { CreateTicketPurchaseDto } from './dto';
import { ServiceResponse } from '../tickets/interface/ticket.response';
import { TicketPurchaseResponseDto } from './dto/ticket-purchase-response.dto';
import { TicketPurchase } from './entities/ticket-purchase.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Ticket Purchases')
@ApiBearerAuth()
@Controller('ticket-purchases')
@UseGuards(JwtAuthGuard)
export class TicketPurchaseController {
  constructor(private readonly ticketPurchaseService: TicketPurchaseService) {}

  @Post('purchase')
  @ApiOperation({ summary: 'Purchase tickets using wallet' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Tickets have been successfully purchased',
    type: TicketPurchaseResponseDto,
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

  @Post('resell/:purchaseId')
  @ApiOperation({ summary: 'List a ticket for resale' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Ticket has been successfully listed for resale',
    type: TicketPurchaseResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid resale data or resale not allowed',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Ticket not found',
  })
  async resellTicket(
    @Param('purchaseId', ParseUUIDPipe) purchaseId: string,
    @Body('newPrice') newPrice: number,
    @Body('sellerWalletAddress') sellerWalletAddress: string,
  ): Promise<ServiceResponse<Ticket>> {
    return this.ticketPurchaseService.resellTicket(
      purchaseId,
      newPrice,
      sellerWalletAddress,
    );
  }

  @Get('history/:buyerEmail')
  @ApiOperation({ summary: 'Get purchase history for a buyer' })
  @ApiParam({
    name: 'buyerEmail',
    description: 'Email of the buyer',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns purchase history',
    type: [TicketPurchaseResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No purchases found',
  })
  async getPurchaseHistory(
    @Param('buyerEmail') buyerEmail: string,
  ): Promise<ServiceResponse<TicketPurchase[]>> {
    return this.ticketPurchaseService.getPurchaseHistory(buyerEmail);
  }
}
