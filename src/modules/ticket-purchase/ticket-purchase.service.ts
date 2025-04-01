import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Ticket } from '../tickets/entities/ticket.entity';
import { CreateTicketPurchaseDto } from '../tickets/dto/create-ticket-purchase.dto';
import { CreateTicketResaleDto } from '../tickets/dto/create-ticket-resale.dto';
import { ServiceResponse } from '../tickets/interface/ticket.response';
import { TicketStatus } from '../tickets/enums';
import { PurchaseStatus } from './enums';
import { TicketPurchase } from './entities/ticket.purchase.entity';
import { TicketResale } from './entities/ticket.resale.entity';
import { RedisService } from '../redis/redis.service';
import { PaymentService } from '../payment/payment.service';
import { OnEvent } from '@nestjs/event-emitter';
import { WalletService } from '../wallet/wallet.service';

/**
 * Service responsible for handling ticket purchase, resale, and validation operations.
 * Implements distributed locking using Redis to prevent race conditions during purchases.
 */
@Injectable()
export class TicketPurchaseService {
  private readonly logger = new Logger(TicketPurchaseService.name);
  private readonly LOCK_TTL = 30; // 30 seconds lock timeout

  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    @InjectRepository(TicketPurchase)
    private readonly purchaseRepository: Repository<TicketPurchase>,
    @InjectRepository(TicketResale)
    private readonly resaleRepository: Repository<TicketResale>,
    private readonly redisService: RedisService,
    private readonly dataSource: DataSource,
    private readonly paymentService: PaymentService,
    private readonly walletService: WalletService,
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
    const {
      ticketId,
      quantity,
      buyerEmail,
      buyerFirstName,
      buyerLastName,
      buyerWalletAddress,
      userId,
    } = createTicketPurchaseDto;

    // Try to acquire lock
    const lockKey = `ticket:purchase:${ticketId}`;
    const lockAcquired = await this.redisService.acquireLock(
      lockKey,
      this.LOCK_TTL,
    );

    if (!lockAcquired) {
      throw new ConflictException('Ticket is being purchased by another user');
    }

    try {
      // Start transaction
      await this.dataSource.transaction(async (transactionalEntityManager) => {
        // Get ticket details with lock
        const ticket = await transactionalEntityManager.findOne(Ticket, {
          where: { id: ticketId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!ticket) {
          throw new HttpException('Ticket not found', HttpStatus.NOT_FOUND);
        }

        // Validate purchase
        await this.validateTicketPurchase(ticket, createTicketPurchaseDto);

        // Calculate total price
        const totalPrice = ticket.basePrice * quantity;

        // Check buyer's wallet balance
        const buyerBalance =
          await this.walletService.getWalletBalance(buyerWalletAddress);
        if (buyerBalance < totalPrice) {
          throw new BadRequestException('Insufficient wallet balance');
        }

        // Transfer funds from buyer to seller
        const transferSuccess = await this.walletService.transferFunds(
          buyerWalletAddress,
          ticket.sellerWalletAddress,
          totalPrice,
        );

        if (!transferSuccess) {
          throw new HttpException(
            'Failed to transfer funds',
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        }

        // Create purchase record
        const purchase = transactionalEntityManager.create(TicketPurchase, {
          buyerEmail,
          buyerFirstName,
          buyerLastName,
          buyerWalletAddress,
          ticket,
          quantity,
          totalPrice,
          status: PurchaseStatus.COMPLETED,
          userId,
        });

        // Update ticket availability
        await transactionalEntityManager.update(Ticket, ticketId, {
          quantity: ticket.quantity - quantity,
          status:
            ticket.quantity - quantity === 0
              ? TicketStatus.SOLD
              : TicketStatus.AVAILABLE,
        });

        // Save purchase
        await transactionalEntityManager.save(purchase);
      });

      // Release lock
      await this.redisService.releaseLock(lockKey);

      return {
        statusCode: HttpStatus.CREATED,
        success: true,
        message: 'Ticket purchased successfully',
        data: await this.purchaseRepository.findOne({
          where: { ticket: { id: ticketId }, buyerEmail },
          relations: ['ticket'],
        }),
      };
    } catch (error) {
      // Release lock on error
      await this.redisService.releaseLock(lockKey);
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
    purchaseId: string,
    newPrice: number,
    sellerWalletAddress: string,
    userId: string,
  ): Promise<ServiceResponse<Ticket>> {
    const lockKey = `ticket:resale:${purchaseId}`;
    const lockAcquired = await this.redisService.acquireLock(
      lockKey,
      this.LOCK_TTL,
    );

    if (!lockAcquired) {
      throw new ConflictException('Ticket is being resold by another user');
    }

    try {
      const result = await this.dataSource.transaction(
        async (transactionalEntityManager) => {
          const purchase = await transactionalEntityManager.findOne(
            TicketPurchase,
            {
              where: { id: purchaseId },
              relations: ['ticket'],
              lock: { mode: 'pessimistic_write' },
            },
          );

          if (!purchase) {
            throw new NotFoundException('Purchase not found');
          }

          if (purchase.userId !== userId) {
            throw new ConflictException('Not authorized to resell this ticket');
          }

          if (purchase.status !== PurchaseStatus.COMPLETED) {
            throw new BadRequestException(
              'Only completed purchases can be resold',
            );
          }

          // Validate resale price
          if (newPrice > purchase.ticket.maxResellPrice) {
            throw new BadRequestException(
              `Resale price exceeds maximum allowed price of ${purchase.ticket.maxResellPrice}`,
            );
          }

          // Create new ticket for resale
          const resaleTicket = transactionalEntityManager.create(Ticket, {
            ...purchase.ticket,
            id: undefined,
            basePrice: newPrice,
            sellerWalletAddress,
            isResale: true,
            originalPurchaseId: purchaseId,
            quantity: purchase.quantity,
            status: TicketStatus.AVAILABLE,
          });

          // Update original purchase status
          await transactionalEntityManager.update(TicketPurchase, purchaseId, {
            status: PurchaseStatus.RESOLD,
          });

          return await transactionalEntityManager.save(resaleTicket);
        },
      );

      await this.redisService.releaseLock(lockKey);

      return {
        statusCode: HttpStatus.CREATED,
        success: true,
        message: 'Ticket listed for resale successfully',
        data: result,
      };
    } catch (error) {
      await this.redisService.releaseLock(lockKey);
      throw error;
    }
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

  async getPurchaseHistory(
    buyerEmail: string,
  ): Promise<ServiceResponse<TicketPurchase[]>> {
    const purchases = await this.purchaseRepository.find({
      where: { buyerEmail },
      relations: ['ticket'],
    });

    return {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Purchase history retrieved successfully',
      data: purchases,
    };
  }
}
