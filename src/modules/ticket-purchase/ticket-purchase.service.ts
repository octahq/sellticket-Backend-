import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket } from '../tickets/entities/ticket.entity';
import { TicketPurchase } from '../tickets/entities/ticket.purchase.entity';
import { TicketResale } from '../tickets/entities/ticket.resale.entity';
import { CreateTicketPurchaseDto } from '../tickets/dto/create-ticket-purchase.dto';
import { CreateTicketResaleDto } from '../tickets/dto/create-ticket-resale.dto';
import { ServiceResponse } from '../tickets/interface/ticket.response';
import { TicketStatus } from '../tickets/enums';

@Injectable()
export class TicketPurchaseService {
  private readonly logger = new Logger(TicketPurchaseService.name);

  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    @InjectRepository(TicketPurchase)
    private readonly purchaseRepository: Repository<TicketPurchase>,
    @InjectRepository(TicketResale)
    private readonly resaleRepository: Repository<TicketResale>,
  ) {}

  async purchaseTicket(
    createTicketPurchaseDto: CreateTicketPurchaseDto,
  ): Promise<ServiceResponse<TicketPurchase>> {
    this.logger.log(
      `Processing ticket purchase for ticket ${createTicketPurchaseDto.ticketId}`,
      { purchaseData: createTicketPurchaseDto },
    );

    const ticket = await this.getTicketById(createTicketPurchaseDto.ticketId);
    await this.validateTicketPurchase(ticket, createTicketPurchaseDto);

    const purchase = this.purchaseRepository.create({
      ...createTicketPurchaseDto,
      ticket,
    });

    await this.updateTicketAfterPurchase(
      ticket,
      createTicketPurchaseDto.quantity,
    );

    const savedPurchase = await this.purchaseRepository.save(purchase);
    this.logger.log(
      `Successfully processed purchase with ID ${savedPurchase.id}`,
    );

    return {
      statusCode: HttpStatus.CREATED,
      success: true,
      message: 'Ticket purchased successfully',
      data: savedPurchase,
    };
  }

  async resellTicket(
    createTicketResaleDto: CreateTicketResaleDto,
  ): Promise<ServiceResponse<TicketResale>> {
    this.logger.log(
      `Creating resale listing for ticket ${createTicketResaleDto.ticketId}`,
      { resaleData: createTicketResaleDto },
    );

    const ticket = await this.getTicketById(createTicketResaleDto.ticketId);
    await this.validateTicketResale(ticket, createTicketResaleDto);

    const resale = this.resaleRepository.create({
      ...createTicketResaleDto,
      ticket,
    });

    const savedResale = await this.resaleRepository.save(resale);
    this.logger.log(
      `Successfully created resale listing with ID ${savedResale.id}`,
    );

    return {
      statusCode: HttpStatus.CREATED,
      success: true,
      message: 'Ticket listed for resale successfully',
      data: savedResale,
    };
  }

  async validateTicket(ticketId: string): Promise<ServiceResponse<boolean>> {
    const ticket = await this.getTicketById(ticketId);
    const isValid = ticket.status === TicketStatus.SOLD;

    return {
      statusCode: HttpStatus.OK,
      success: true,
      message: isValid ? 'Ticket is valid' : 'Ticket is not valid',
      data: isValid,
    };
  }

  // async getUserTickets(
  //   userId: string,
  // ): Promise<ServiceResponse<TicketPurchase[]>> {
  //   this.logger.log(`Retrieving tickets for user ${userId}`);

  //   const purchases = await this.purchaseRepository.find({
  //     where: { userId },
  //     relations: ['ticket', 'ticket.event'],
  //   });

  //   return {
  //     statusCode: HttpStatus.OK,
  //     success: true,
  //     message: 'User tickets retrieved successfully',
  //     data: purchases,
  //   };
  // }

  private async getTicketById(id: string): Promise<Ticket> {
    const ticket = await this.ticketRepository.findOne({
      where: { id },
      relations: ['event'],
    });

    if (!ticket) {
      this.logger.error(`Ticket not found with ID ${id}`);
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }

    return ticket;
  }

  private async validateTicketPurchase(
    ticket: Ticket,
    purchase: CreateTicketPurchaseDto,
  ): Promise<void> {
    this.logger.debug('Validating ticket purchase', {
      ticketId: ticket.id,
      quantity: purchase.quantity,
    });

    if (ticket.status !== TicketStatus.AVAILABLE) {
      this.logger.error(`Ticket ${ticket.id} is not available for purchase`);
      throw new ConflictException('Ticket is not available for purchase');
    }

    if (ticket.quantity && ticket.quantity < purchase.quantity) {
      this.logger.error(
        `Purchase quantity ${purchase.quantity} exceeds available tickets ${ticket.quantity}`,
      );
      throw new BadRequestException(
        'Requested quantity exceeds available tickets',
      );
    }

    if (ticket.purchaseLimit && purchase.quantity > ticket.purchaseLimit) {
      this.logger.error(
        `Purchase quantity ${purchase.quantity} exceeds limit ${ticket.purchaseLimit}`,
      );
      throw new BadRequestException(
        `Purchase quantity exceeds limit of ${ticket.purchaseLimit}`,
      );
    }

    this.logger.debug('Ticket purchase validation successful');
  }

  private async validateTicketResale(
    ticket: Ticket,
    resale: CreateTicketResaleDto,
  ): Promise<void> {
    this.logger.debug('Validating ticket resale', {
      ticketId: ticket.id,
      resalePrice: resale.resalePrice,
    });

    if (!ticket.isResaleEnabled) {
      this.logger.error(`Resale not enabled for ticket ${ticket.id}`);
      throw new BadRequestException('Ticket resale is not enabled');
    }

    if (ticket.maxResellPrice && resale.resalePrice > ticket.maxResellPrice) {
      this.logger.error(
        `Resale price ${resale.resalePrice} exceeds maximum ${ticket.maxResellPrice}`,
      );
      throw new BadRequestException(
        `Resale price exceeds maximum allowed price of ${ticket.maxResellPrice}`,
      );
    }

    this.logger.debug('Ticket resale validation successful');
  }

  private async updateTicketAfterPurchase(
    ticket: Ticket,
    purchaseQuantity: number,
  ): Promise<void> {
    this.logger.debug('Updating ticket after purchase', {
      ticketId: ticket.id,
      purchaseQuantity,
      currentQuantity: ticket.quantity,
    });

    if (ticket.quantity) {
      ticket.quantity -= purchaseQuantity;

      if (ticket.quantity === 0) {
        ticket.status = TicketStatus.SOLD_OUT;
        this.logger.log(`Ticket ${ticket.id} is now sold out`);
      }

      await this.ticketRepository.save(ticket);
      this.logger.debug('Ticket updated successfully', {
        ticketId: ticket.id,
        newQuantity: ticket.quantity,
        status: ticket.status,
      });
    }
  }
}
