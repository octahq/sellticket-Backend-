import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { Ticket } from '../tickets/entities/ticket.entity';
import { CreateTicketPurchaseDto } from '../tickets/dto/create-ticket-purchase.dto';
import { CreateTicketResaleDto } from '../tickets/dto/create-ticket-resale.dto';
import { ServiceResponse } from '../tickets/interface/ticket.response';
import { TicketStatus } from '../tickets/enums';
import { PurchaseStatus } from './enums';
import { TicketPurchase } from './entities/ticket.purchase.entity';
import { TicketResale } from './entities/ticket.resale.entity';

/**
 * Service responsible for handling ticket purchase, resale, and validation operations.
 * Implements distributed locking using Redis to prevent race conditions during purchases.
 */
@Injectable()
export class TicketPurchaseService {
  private readonly logger = new Logger(TicketPurchaseService.name);
  private readonly LOCK_TTL = 30;
  private readonly PURCHASE_TIMEOUT = 10 * 60;

  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    @InjectRepository(TicketPurchase)
    private readonly purchaseRepository: Repository<TicketPurchase>,
    @InjectRepository(TicketResale)
    private readonly resaleRepository: Repository<TicketResale>,
    @InjectRedis() private readonly redis: Redis,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Purchase a ticket with distributed locking to prevent overselling
   * @param createTicketPurchaseDto - The purchase details including ticket ID and quantity
   * @returns A ServiceResponse containing the created purchase record
   * @throws ConflictException when ticket is being purchased by another user
   * @throws NotFoundException when ticket doesn't exist
   * @throws BadRequestException when purchase validation fails
   */
  async purchaseTicket(
    createTicketPurchaseDto: CreateTicketPurchaseDto,
  ): Promise<ServiceResponse<TicketPurchase>> {
    const { ticketId } = createTicketPurchaseDto;
    const lockKey = `ticket:${ticketId}:lock`;

    try {
      const locked = await this.acquireLock(lockKey);
      if (!locked) {
        throw new ConflictException('Ticket is currently being purchased');
      }

      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        const ticket = await queryRunner.manager.findOne(Ticket, {
          where: { id: ticketId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!ticket) {
          throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
        }

        await this.validateTicketPurchase(ticket, createTicketPurchaseDto);

        const purchase = this.purchaseRepository.create({
          ...createTicketPurchaseDto,
          ticket,
          status: PurchaseStatus.PENDING,
        });

        ticket.quantity -= createTicketPurchaseDto.quantity;
        if (ticket.quantity === 0) {
          ticket.status = TicketStatus.SOLD_OUT;
        }

        await queryRunner.manager.save(ticket);
        const savedPurchase = await queryRunner.manager.save(purchase);
        await queryRunner.commitTransaction();

        return {
          statusCode: HttpStatus.CREATED,
          success: true,
          message: 'Ticket purchased successfully',
          data: savedPurchase,
        };
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
        await this.releaseLock(lockKey);
      }
    } catch (error) {
      this.logger.error('Error processing ticket purchase', error.stack);
      throw error;
    }
  }

  /**
   * List a ticket for resale
   * @param createTicketResaleDto - The resale details including ticket ID and price
   * @returns A ServiceResponse containing the created resale listing
   * @throws BadRequestException when resale is not enabled or price exceeds limit
   * @throws NotFoundException when ticket doesn't exist
   */
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

  /**
   * Validate a ticket's status
   * @param ticketId - The ID of the ticket to validate
   * @returns A ServiceResponse containing boolean indicating if ticket is valid
   * @throws NotFoundException when ticket doesn't exist
   */
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

  /**
   * Retrieve a ticket by ID with its event relation
   * @param id - The ticket ID
   * @returns The found ticket entity
   * @throws NotFoundException when ticket doesn't exist
   */
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
   * Validate ticket purchase request against business rules
   * @param ticket - The ticket entity to validate against
   * @param purchase - The purchase request to validate
   * @throws ConflictException when ticket is not available
   * @throws BadRequestException when quantity exceeds limits
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
   * Validate ticket resale request against business rules
   * @param ticket - The ticket entity to validate against
   * @param resale - The resale request to validate
   * @throws BadRequestException when resale is not enabled or price exceeds limit
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
   * Acquire a distributed lock using Redis
   * @param key - The lock key to acquire
   * @returns boolean indicating if lock was acquired
   */
  private async acquireLock(key: string): Promise<boolean> {
    const result = await this.redis.set(
      key,
      'locked',
      'EX',
      this.LOCK_TTL,
      'NX',
    );
    return result === 'OK';
  }

  /**
   * Release a distributed lock in Redis
   * @param key - The lock key to release
   */
  private async releaseLock(key: string): Promise<void> {
    await this.redis.del(key);
  }

  /**
   * Set a timeout for a pending purchase
   * @param purchaseId - The ID of the purchase to timeout
   */
  private async setPurchaseTimeout(purchaseId: string): Promise<void> {
    await this.redis.set(
      `purchase:${purchaseId}:timeout`,
      'pending',
      'EX',
      this.PURCHASE_TIMEOUT,
    );
  }
}
