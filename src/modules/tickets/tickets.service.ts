import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
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

/**
 * Service handling all ticket-related operations including creation,
 * purchase, resale, and retrieval.
 */
@Injectable()
export class TicketsService {
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
   * @returns {Promise<Ticket>} The created ticket
   */
  async createTicket(createTicketDto: CreateTicketDto): Promise<Ticket> {
    const event = await this.eventRepository.findOne({
      where: { id: createTicketDto.eventId },
    });
    if (!event) {
      throw new NotFoundException(
        `Event with ID ${createTicketDto.eventId} not found`,
      );
    }

    await this.validateTicketTypeRequirements(createTicketDto);

    const ticket = this.ticketRepository.create({
      ...createTicketDto,
      status: TicketStatus.AVAILABLE,
    });

    return this.ticketRepository.save(ticket);
  }

  /**
   * Processes a ticket purchase
   * @param createTicketPurchaseDto - The purchase details
   * @throws {NotFoundException} When the ticket is not found
   * @throws {BadRequestException} When purchase validation fails
   * @throws {ConflictException} When ticket is not available
   * @returns {Promise<TicketPurchase>} The purchase record
   */
  async purchaseTicket(
    createTicketPurchaseDto: CreateTicketPurchaseDto,
  ): Promise<TicketPurchase> {
    const ticket = await this.findTicketById(createTicketPurchaseDto.ticketId);

    await this.validateTicketPurchase(ticket, createTicketPurchaseDto);

    const purchase = this.purchaseRepository.create({
      ...createTicketPurchaseDto,
      ticket,
    });

    await this.updateTicketAfterPurchase(
      ticket,
      createTicketPurchaseDto.quantity,
    );

    return this.purchaseRepository.save(purchase);
  }

  /**
   * Creates a new ticket resale listing
   * @param createTicketResaleDto - The resale listing details
   * @throws {NotFoundException} When the ticket is not found
   * @throws {BadRequestException} When resale validation fails
   * @returns {Promise<TicketResale>} The created resale listing
   */
  async createTicketResale(
    createTicketResaleDto: CreateTicketResaleDto,
  ): Promise<TicketResale> {
    const ticket = await this.findTicketById(createTicketResaleDto.ticketId);

    await this.validateTicketResale(ticket, createTicketResaleDto);

    const resale = this.resaleRepository.create({
      ...createTicketResaleDto,
      ticket,
    });

    return this.resaleRepository.save(resale);
  }

  /**
   * Retrieves a ticket by its ID
   * @param id - The ticket's UUID
   * @throws {NotFoundException} When the ticket is not found
   * @returns {Promise<Ticket>} The found ticket
   */
  async findTicketById(id: string): Promise<Ticket> {
    const ticket = await this.ticketRepository.findOne({
      where: { id },
      relations: ['event'],
    });
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }
    return ticket;
  }

  /**
   * Retrieves all tickets
   * @returns {Promise<Ticket[]>} Array of all tickets
   */
  async findAllTickets(): Promise<Ticket[]> {
    return this.ticketRepository.find({
      relations: ['event'],
    });
  }

  /**
   * Retrieves all tickets for a specific event
   * @param eventId - The event's ID
   * @returns {Promise<Ticket[]>} Array of tickets for the event
   */
  async findTicketsByEvent(eventId: number): Promise<Ticket[]> {
    return this.ticketRepository.find({
      where: { eventId },
      relations: ['event'],
    });
  }

  /**
   * Validates ticket type specific requirements
   * @param createTicketDto - The ticket creation data
   * @throws {BadRequestException} When requirements are not met
   */
  private async validateTicketTypeRequirements(
    createTicketDto: CreateTicketDto,
  ): Promise<void> {
    const { type, basePrice, tokenGatingType, contractAddress } =
      createTicketDto;

    if (type === TicketType.PAID && !basePrice) {
      throw new BadRequestException('Paid tickets require a base price');
    }

    if (
      type === TicketType.TOKEN_GATED &&
      (!tokenGatingType || !contractAddress)
    ) {
      throw new BadRequestException(
        'Token-gated tickets require gating type and contract address',
      );
    }

    if (
      type === TicketType.FREE &&
      createTicketDto.isGroupTicket &&
      !createTicketDto.groupSize
    ) {
      throw new BadRequestException('Group tickets require a group size');
    }
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
    if (ticket.status !== TicketStatus.AVAILABLE) {
      throw new ConflictException('Ticket is not available for purchase');
    }

    if (ticket.quantity && ticket.quantity < purchase.quantity) {
      throw new BadRequestException(
        'Requested quantity exceeds available tickets',
      );
    }

    if (ticket.purchaseLimit && purchase.quantity > ticket.purchaseLimit) {
      throw new BadRequestException(
        `Purchase quantity exceeds limit of ${ticket.purchaseLimit}`,
      );
    }
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
    if (!ticket.isResaleEnabled) {
      throw new BadRequestException('Ticket resale is not enabled');
    }

    if (ticket.maxResellPrice && resale.resalePrice > ticket.maxResellPrice) {
      throw new BadRequestException(
        `Resale price exceeds maximum allowed price of ${ticket.maxResellPrice}`,
      );
    }
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
    if (ticket.quantity) {
      ticket.quantity -= purchaseQuantity;

      if (ticket.quantity === 0) {
        ticket.status = TicketStatus.SOLD_OUT;
      }

      await this.ticketRepository.save(ticket);
    }
  }
}
