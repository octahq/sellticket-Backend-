import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Ticket } from './entities/ticket.entity';
import { Event } from '../event/entities/event.entity';
import { CreateTicketDto } from './dto';
import { TicketStatus, TicketType } from './enums';
import { ServiceResponse } from './interface/ticket.response';
import { TicketResaleHistory } from '../ticket-purchase/entities/ticket.resale.history.entity';

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
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(TicketResaleHistory)
    private readonly resaleHistoryRepository: Repository<TicketResaleHistory>,
    private readonly dataSource: DataSource,
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
   * Lists tickets available for resale
   * @returns {Promise<ServiceResponse<Ticket[]>>} Response with array of resale tickets
   */
  async findResaleTickets(): Promise<ServiceResponse<Ticket[]>> {
    this.logger.log('Retrieving all resale tickets');
    const tickets = await this.ticketRepository.find({
      where: { isResaleEnabled: true },
      relations: ['event'],
    });

    return {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Resale tickets retrieved successfully',
      data: tickets,
    };
  }

  /**
   * Updates ticket status after successful resale
   * @param ticketId - The ticket's UUID
   * @param newOwnerId - The new owner's ID
   * @param resalePrice - The resale price
   */
  async updateTicketAfterResale(
    ticketId: string,
    newOwnerId: string,
    resalePrice: number,
  ): Promise<ServiceResponse<Ticket>> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const ticket = await this.getTicketById(ticketId);

      // Create resale history record
      const resaleHistory = this.resaleHistoryRepository.create({
        ticket,
        previousOwnerId: ticket.currentOwnerId,
        newOwnerId,
        resalePrice,
      });

      // Update ticket ownership
      ticket.currentOwnerId = newOwnerId;

      // Save both changes in a transaction
      await queryRunner.manager.save(resaleHistory);
      const updatedTicket = await queryRunner.manager.save(ticket);
      await queryRunner.commitTransaction();

      return {
        statusCode: HttpStatus.OK,
        success: true,
        message: 'Ticket ownership and resale history updated successfully',
        data: updatedTicket,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Error updating ticket ownership', error.stack);
      throw error;
    } finally {
      await queryRunner.release();
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

  /**
   * Validates ticket type specific requirements
   * @param createTicketDto - The ticket creation data
   * @throws {BadRequestException} When requirements are not met
   */
  private async validateTicketTypeRequirements(
    ticket: CreateTicketDto,
  ): Promise<void> {
    this.logger.debug('Validating ticket type requirements', {
      ticketType: ticket.type,
    });

    if (ticket.type === TicketType.PAID && !ticket.basePrice) {
      this.logger.error('Paid ticket requires a base price');
      throw new BadRequestException('Paid ticket requires a base price');
    }

    if (
      ticket.type === TicketType.TOKEN_GATED &&
      (!ticket.tokenGatingType || !ticket.contractAddress)
    ) {
      this.logger.error(
        'Token gated ticket requires token gating type and contract address',
      );
      throw new BadRequestException(
        'Token gated ticket requires token gating type and contract address',
      );
    }

    if (ticket.isGroupTicket && (!ticket.groupSize || ticket.groupSize < 2)) {
      this.logger.error('Group ticket requires a valid group size (minimum 2)');
      throw new BadRequestException(
        'Group ticket requires a valid group size (minimum 2)',
      );
    }

    this.logger.debug('Ticket type requirements validation successful');
  }
}
