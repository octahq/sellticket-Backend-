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
import { Ticket } from '../tickets/entities/ticket.entity';
import { CreateTicketPurchaseDto } from '../tickets/dto/create-ticket-purchase.dto';
import { CreateTicketResaleDto } from '../tickets/dto/create-ticket-resale.dto';
import { ServiceResponse } from '../tickets/interface/ticket.response';
import { TicketStatus } from '../tickets/enums';
import { PurchaseStatus, ResaleStatus } from './enums';
import { TicketPurchase } from './entities/ticket.purchase.entity';
import { TicketResale } from './entities/ticket.resale.entity';
import { RedisService } from '../../redis/redis.service';
import { PaymentService } from '../payment/payment.service';
import { ProcessPaymentDto } from '../payment/dto/process-payment.dto';
import { PaymentMethod } from '../payment/enums/payment-method.enum';
import { PaymentStatus } from '../payment/enums/payment-status.enum';
import { OnEvent } from '@nestjs/event-emitter';
import { TicketResaleHistory } from './entities/ticket.resale.history.entity';

/**
 * Service responsible for handling ticket purchase, resale, and validation operations.
 * Implements distributed locking using Redis to prevent race conditions during purchases.
 */
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
    @InjectRepository(TicketResaleHistory)
    private readonly resaleHistoryRepository: Repository<TicketResaleHistory>,
    private readonly redisService: RedisService,
    private readonly dataSource: DataSource,
    private readonly paymentService: PaymentService,
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
    const { ticketId, buyerEmail, quantity } = createTicketPurchaseDto;
    const lockKey = `ticket:${ticketId}:lock`;

    try {
      const locked = await this.redisService.acquireLock(lockKey);
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

        const paymentDto: ProcessPaymentDto = {
          amount: ticket.basePrice * quantity * 100,
          currency: 'NGN',
          email: buyerEmail,
          paymentMethod: PaymentMethod.CREDIT_CARD,
        };

        const paymentResult =
          await this.paymentService.processPayment(paymentDto);

        if (paymentResult.status === PaymentStatus.FAILED) {
          await queryRunner.rollbackTransaction();
          throw new BadRequestException(
            `Payment initialization failed: ${paymentResult.message}`,
          );
        }

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
          message:
            'Ticket purchase initiated, waiting for payment confirmation.',
          data: savedPurchase,
        };
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
        await this.redisService.releaseLock(lockKey);
      }
    } catch (error) {
      this.logger.error('Error processing ticket purchase', error.stack);
      throw error;
    }
  }

  @OnEvent('payment.webhook.success')
  async handlePaymentWebhookSuccess(payload: { paymentReference: string }) {
    this.logger.log(
      `Payment webhook success event received for reference: ${payload.paymentReference}`,
    );
    try {
      const paymentReference = payload.paymentReference;
      const payment =
        await this.paymentService.findPaymentByReference(paymentReference);

      if (!payment) {
        this.logger.warn(
          `Payment record not found for reference: ${paymentReference} during webhook success event handling.`,
        );
        return;
      }

      const purchase = await this.purchaseRepository.findOne({
        where: { buyerEmail: payment.email, status: PurchaseStatus.PENDING },
        relations: ['ticket'],
      });

      if (purchase) {
        purchase.status = PurchaseStatus.COMPLETED;
        await this.purchaseRepository.save(purchase);
        this.logger.log(
          `TicketPurchase status updated to COMPLETED for payment reference: ${paymentReference}, purchase ID: ${purchase.id}`,
        );
      } else {
        this.logger.warn(
          `TicketPurchase record not found for payment reference: ${paymentReference} during webhook success event handling.`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error handling payment webhook success event for reference ${payload.paymentReference}:`,
        error.stack,
      );
    }
  }

  @OnEvent('payment.webhook.failed')
  async handlePaymentWebhookFailed(payload: { paymentReference: string }) {
    this.logger.log(
      `Payment webhook failed event received for reference: ${payload.paymentReference}`,
    );
    try {
      const paymentReference = payload.paymentReference;
      const payment =
        await this.paymentService.findPaymentByReference(paymentReference);

      if (!payment) {
        this.logger.warn(
          `Payment record not found for reference: ${paymentReference} during webhook failed event handling.`,
        );
        return;
      }

      const purchase = await this.purchaseRepository.findOne({
        where: { buyerEmail: payment.email, status: PurchaseStatus.PENDING },
      });

      if (purchase) {
        purchase.status = PurchaseStatus.CANCELLED;
        await this.purchaseRepository.save(purchase);
        this.logger.log(
          `TicketPurchase status updated to CANCELLED due to payment failure for payment reference: ${paymentReference}, purchase ID: ${purchase.id}`,
        );
      } else {
        this.logger.warn(
          `TicketPurchase record not found for payment reference: ${paymentReference} during webhook failed event handling.`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error handling payment webhook failed event for reference ${payload.paymentReference}:`,
        error.stack,
      );
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
   * Purchase a resale ticket
   * @param resaleId - The ID of the resale listing
   * @param buyerEmail - Email of the buyer
   */
  async purchaseResaleTicket(
    resaleId: string,
    buyerEmail: string,
  ): Promise<ServiceResponse<TicketPurchase>> {
    const lockKey = `resale:${resaleId}:lock`;

    try {
      const locked = await this.redisService.acquireLock(lockKey);
      if (!locked) {
        throw new ConflictException(
          'Resale ticket is currently being purchased',
        );
      }

      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        const resale = await this.resaleRepository.findOne({
          where: { id: resaleId },
          relations: ['ticket'],
          lock: { mode: 'pessimistic_write' },
        });

        if (!resale) {
          throw new NotFoundException(`Resale listing ${resaleId} not found`);
        }

        if (resale.status !== ResaleStatus.LISTED) {
          throw new ConflictException('Resale ticket is no longer available');
        }

        // Process payment
        const paymentDto: ProcessPaymentDto = {
          amount: resale.resalePrice * 100,
          currency: 'NGN',
          email: buyerEmail,
          paymentMethod: PaymentMethod.CREDIT_CARD,
        };

        const paymentResult =
          await this.paymentService.processPayment(paymentDto);

        if (paymentResult.status === PaymentStatus.FAILED) {
          throw new BadRequestException(
            `Payment failed: ${paymentResult.message}`,
          );
        }

        // Create purchase record
        const purchase = this.purchaseRepository.create({
          ticket: resale.ticket,
          buyerEmail,
          quantity: 1,
          status: PurchaseStatus.COMPLETED,
          purchasePrice: resale.resalePrice,
        });

        // Create resale history record
        const resaleHistory = this.resaleHistoryRepository.create({
          ticket: resale.ticket,
          previousOwnerId: resale.ticket.currentOwnerId,
          newOwnerId: buyerEmail,
          resalePrice: resale.resalePrice,
        });

        // Update ticket ownership
        resale.ticket.currentOwnerId = buyerEmail;

        // Update resale status
        resale.status = ResaleStatus.SOLD;

        // Save all changes
        await queryRunner.manager.save(resale.ticket);
        await queryRunner.manager.save(resaleHistory);
        await queryRunner.manager.save(resale);
        const savedPurchase = await queryRunner.manager.save(purchase);
        await queryRunner.commitTransaction();

        return {
          statusCode: HttpStatus.CREATED,
          success: true,
          message: 'Resale ticket purchased successfully',
          data: savedPurchase,
        };
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
        await this.redisService.releaseLock(lockKey);
      }
    } catch (error) {
      this.logger.error('Error processing resale ticket purchase', error.stack);
      throw error;
    }
  }

  /**
   * Cancel a resale listing
   * @param resaleId - The ID of the resale listing to cancel
   */
  async cancelResaleListing(
    resaleId: string,
  ): Promise<ServiceResponse<TicketResale>> {
    const resale = await this.resaleRepository.findOne({
      where: { id: resaleId },
      relations: ['ticket'],
    });

    if (!resale) {
      throw new NotFoundException(`Resale listing ${resaleId} not found`);
    }

    if (resale.status !== ResaleStatus.LISTED) {
      throw new BadRequestException(
        'Cannot cancel a non-active resale listing',
      );
    }

    resale.status = ResaleStatus.CANCELLED;
    const savedResale = await this.resaleRepository.save(resale);

    return {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Resale listing cancelled successfully',
      data: savedResale,
    };
  }

  /**
   * Get all active resale listings
   */
  async getActiveResaleListings(): Promise<ServiceResponse<TicketResale[]>> {
    const listings = await this.resaleRepository.find({
      where: { status: ResaleStatus.LISTED },
      relations: ['ticket', 'ticket.event'],
    });

    return {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Active resale listings retrieved successfully',
      data: listings,
    };
  }

  /**
   * Validate a ticket's status
   * @param ticketId - The ID of the ticket to validate
   * @returns A ServiceResponse containing boolean indicating if ticket is valid
   * @throws NotFoundException when ticket doesn't exist
   */
  async validateTicket(ticketId: string): Promise<ServiceResponse<boolean>> {
    this.logger.log(`Validating ticket with ID ${ticketId}`);

    const ticket = await this.getTicketById(ticketId);

    const isValid = ticket.status === TicketStatus.SOLD;
    this.logger.log(`Ticket ${ticketId} is valid: ${isValid}`);

    return {
      statusCode: HttpStatus.OK,
      success: true,
      message: isValid ? 'Ticket is valid' : 'Ticket is not valid',
      data: isValid,
    };
  }

  // /**
  //  * Retrieve all purchases for a user
  //  * @param userId - The ID of the user
  //  * @returns A ServiceResponse containing array of purchases
  //  */
  // async getUserTickets(userId: string): Promise<ServiceResponse<TicketPurchase[]>> {
  //   this.logger.log(`Retrieving tickets for user ${userId}`);

  //   const purchases = await this.purchaseRepository.find({
  //     where: { userId },
  //     relations: ['ticket'],
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
}
