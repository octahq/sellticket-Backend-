import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket } from './entities/ticket.entity';
import { TicketPurchase } from './entities/ticket.purchase.entity';
import { TicketResale } from './entities/ticket.resale.entity';
import { Event } from '../event/entities/event.entity';
import {
  CreateTicketDto,
  CreateTicketPurchaseDto,
  CreateTicketResaleDto,
} from './dto';
import { TicketStatus, TicketType } from './enums';
import { ServiceResponse } from './interface/ticket.response';

/**
 * Service handling all ticket-related operations including creation,
 * purchase, resale, and retrieval.
 */
@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    @InjectRepository(TicketPurchase)
    private readonly purchaseRepository: Repository<TicketPurchase>,
    @InjectRepository(TicketResale)
    private readonly resaleRepository: Repository<TicketResale>,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
  ) {}

  /**
   * Creates a new ticket for an event
   * @param createTicketDto - The ticket creation data
   * @throws {NotFoundException} When the event is not found
   * @throws {BadRequestException} When ticket type requirements are not met
   * @returns {Promise<ServiceResponse<Ticket>>} Response with created ticket
   */
  async createTicket(
    createTicketDto: CreateTicketDto,
  ): Promise<ServiceResponse<Ticket>> {
    this.logger.log(
      `Creating new ticket for event ${createTicketDto.eventId}`,
      { ticketData: createTicketDto },
    );

    const event = await this.eventRepository.findOne({
      where: { id: createTicketDto.eventId },
    });
    if (!event) {
      this.logger.error(`Event not found with ID ${createTicketDto.eventId}`);
      throw new NotFoundException(
        `Event with ID ${createTicketDto.eventId} not found`,
      );
    }

    await this.validateTicketTypeRequirements(createTicketDto);

    const ticket = this.ticketRepository.create({
      ...createTicketDto,
      status: TicketStatus.AVAILABLE,
    });

    const savedTicket = await this.ticketRepository.save(ticket);
    this.logger.log(`Successfully created ticket with ID ${savedTicket.id}`);

    return {
      statusCode: HttpStatus.CREATED,
      success: true,
      message: 'Ticket created successfully',
      data: savedTicket,
    };
  }

  /**
   * Processes a ticket purchase
   * @param createTicketPurchaseDto - The purchase details
   * @throws {NotFoundException} When the ticket is not found
   * @throws {BadRequestException} When purchase validation fails
   * @throws {ConflictException} When ticket is not available
   * @returns {Promise<ServiceResponse<TicketPurchase>>} Response with purchase record
   */
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

  /**
   * Creates a new ticket resale listing
   * @param createTicketResaleDto - The resale listing details
   * @throws {NotFoundException} When the ticket is not found
   * @throws {BadRequestException} When resale validation fails
   * @returns {Promise<ServiceResponse<TicketResale>>} Response with resale listing
   */
  async createTicketResale(
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

  /**
   * Retrieves a ticket by its ID
   * @param id - The ticket's UUID
   * @throws {NotFoundException} When the ticket is not found
   * @returns {Promise<ServiceResponse<Ticket>>} Response with found ticket
   */
  async findTicketById(id: string): Promise<ServiceResponse<Ticket>> {
    const ticket = await this.getTicketById(id);
    return {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Ticket retrieved successfully',
      data: ticket,
    };
  }

  /**
   * Retrieves all tickets
   * @returns {Promise<ServiceResponse<Ticket[]>>} Response with array of tickets
   */
  async findAllTickets(): Promise<ServiceResponse<Ticket[]>> {
    this.logger.log('Retrieving all tickets');
    const tickets = await this.ticketRepository.find({
      relations: ['event'],
    });
    this.logger.log(`Found ${tickets.length} tickets`);

    return {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Tickets retrieved successfully',
      data: tickets,
    };
  }

  /**
   * Retrieves all tickets for a specific event
   * @param eventId - The event's ID
   * @returns {Promise<ServiceResponse<Ticket[]>>} Response with array of tickets
   */
  async findTicketsByEvent(
    eventId: number,
  ): Promise<ServiceResponse<Ticket[]>> {
    this.logger.log(`Retrieving tickets for event ${eventId}`);
    const tickets = await this.ticketRepository.find({
      where: { eventId },
      relations: ['event'],
    });
    this.logger.log(`Found ${tickets.length} tickets for event ${eventId}`);

    return {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Event tickets retrieved successfully',
      data: tickets,
    };
  }

  /**
   * Validates ticket type specific requirements
   * @param createTicketDto - The ticket creation data
   * @throws {BadRequestException} When requirements are not met
   */
  private async validateTicketTypeRequirements(
    createTicketDto: CreateTicketDto,
  ): Promise<void> {
    this.logger.debug('Validating ticket type requirements', {
      ticketType: createTicketDto.type,
    });

    const { type, basePrice, tokenGatingType, contractAddress } =
      createTicketDto;

    if (type === TicketType.PAID && !basePrice) {
      this.logger.error(
        'Paid ticket validation failed: No base price provided',
      );
      throw new BadRequestException('Paid tickets require a base price');
    }

    if (
      type === TicketType.TOKEN_GATED &&
      (!tokenGatingType || !contractAddress)
    ) {
      this.logger.error(
        'Token-gated ticket validation failed: Missing gating type or contract address',
      );
      throw new BadRequestException(
        'Token-gated tickets require gating type and contract address',
      );
    }

    if (
      type === TicketType.FREE &&
      createTicketDto.isGroupTicket &&
      !createTicketDto.groupSize
    ) {
      this.logger.error(
        'Group ticket validation failed: No group size provided',
      );
      throw new BadRequestException('Group tickets require a group size');
    }

    this.logger.debug('Ticket type requirements validated successfully');
  }

  /**
   * Validates a ticket purchase request
   * @param ticket - The ticket being purchased
   * @param purchase - The purchase details
   * @throws {ConflictException} When ticket is not available
   * @throws {BadRequestException} When purchase validation fails
   */
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

  /**
   * Validates a ticket resale request
   * @param ticket - The ticket being resold
   * @param resale - The resale details
   * @throws {BadRequestException} When resale validation fails
   */
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

  /**
   * Updates ticket status and quantity after a purchase
   * @param ticket - The ticket being updated
   * @param purchaseQuantity - Number of tickets purchased
   */
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

  // Private method for internal use
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
}
