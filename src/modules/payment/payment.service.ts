import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { PaymentResponse } from './interfaces/payment-response.interface';
import { PaymentStatus } from './enums/payment-status.enum';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import axios from 'axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { Transaction } from './entities/transaction.entity';
import config from 'src/config/env.config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { HttpService } from '@nestjs/axios';
import { DataSource, Repository } from 'typeorm';
import * as crypto from 'crypto';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly paystackSecretKey: string;
  private readonly paystackInitializeTransactionUrl: string;
  private readonly paystackWebhookSecret: string;
  private readonly paystackVerifyTransactionUrl: string;

  constructor(
    private readonly redisService: RedisService,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly eventEmitter: EventEmitter2,
    private readonly httpService: HttpService,
    private readonly dataSource: DataSource,
  ) {
    this.paystackSecretKey = config.paymentConfig.paystackSecretKey;
    this.paystackInitializeTransactionUrl =
      config.paymentConfig.paystackInitializeTransactionUrl;
    this.paystackWebhookSecret = config.paymentConfig.paystackWebhookSecret;
    this.paystackVerifyTransactionUrl =
      config.paymentConfig.paystackVerifyTransactionUrl;
  }

  async processPayment(
    paymentDto: ProcessPaymentDto,
  ): Promise<PaymentResponse> {
    this.logger.log(
      `Processing payment for email: ${paymentDto.email}, amount: ${paymentDto.amount}`,
    );

    let paymentResponse: PaymentResponse;
    let paymentEntity: Payment;

    try {
      paymentEntity = this.paymentRepository.create({
        amount: paymentDto.amount,
        currency: paymentDto.currency,
        email: paymentDto.email,
        reference: this.generateReference(),
        status: PaymentStatus.PENDING,
      });
      await this.paymentRepository.save(paymentEntity);

      const paystackInitializationResponse =
        await this.initializePaystackTransaction(
          paymentDto,
          paymentEntity.reference,
        );

      const transactionEntity = this.transactionRepository.create({
        payment: paymentEntity,
        gatewayReference: paystackInitializationResponse.reference,
        gatewayResponse: paystackInitializationResponse.gatewayResponse,
        status: paystackInitializationResponse.status,
      });
      await this.transactionRepository.save(transactionEntity);

      paymentResponse = {
        status: PaymentStatus.PENDING,
        message:
          'Payment initialization pending, waiting for webhook confirmation.',
        reference: paymentEntity.reference,
        gatewayResponse: paystackInitializationResponse.gatewayResponse,
      };
    } catch (error) {
      this.logger.error('Payment processing error:', error.stack);
      if (paymentEntity) {
        paymentEntity.status = PaymentStatus.FAILED;
        await this.paymentRepository.save(paymentEntity);
      }
      paymentResponse = {
        status: PaymentStatus.FAILED,
        message: 'Payment processing error',
        reference: paymentEntity?.reference || 'REF_PROCESS_ERROR',
        gatewayResponse: error.message,
      };
      await this.publishPaymentEvent('PaymentFailed', paymentResponse);
    }

    return paymentResponse;
  }

  async processPaystackWebhookEvent(event: any): Promise<void> {
    this.logger.log(`Processing Paystack webhook event: ${event.event}`);

    const signature = event.headers['x-paystack-signature'];
    if (!signature) {
      this.logger.warn('No signature found on Paystack webhook request');
      throw new Error('No signature found on Paystack webhook request');
    }

    const rawBody = JSON.stringify(event.body);
    const isValidSignature = this.verifyPaystackWebhookSignature(
      rawBody,
      signature,
      this.paystackWebhookSecret,
    );

    if (!isValidSignature) {
      this.logger.warn('Invalid signature on Paystack webhook request');
      throw new Error('Invalid signature on Paystack webhook request');
    }

    await this.dataSource.transaction(async (transactionalEntityManager) => {
      try {
        if (event.event === 'transaction.success') {
          const paystackReference = event.data.reference;
          const payment = await transactionalEntityManager
            .getRepository(Payment)
            .findOne({
              where: { reference: paystackReference },
              relations: ['transactions'],
            });

          if (!payment) {
            this.logger.warn(
              `Payment record not found for reference: ${paystackReference}`,
            );
            throw new Error(
              `Payment record not found for reference: ${paystackReference}`,
            );
          }

          const verificationResult =
            await this.verifyTransactionWithPaystack(paystackReference);

          if (verificationResult.status === PaymentStatus.SUCCESS) {
            payment.status = PaymentStatus.SUCCESS;
            await transactionalEntityManager
              .getRepository(Payment)
              .save(payment);

            const transactionEntity = payment.transactions[0];
            if (transactionEntity) {
              transactionEntity.status = PaymentStatus.SUCCESS;
              transactionEntity.gatewayResponse =
                verificationResult.gatewayResponse;
              await transactionalEntityManager
                .getRepository(Transaction)
                .save(transactionEntity);
            }

            this.logger.log(
              `Payment successful for reference: ${paystackReference}`,
            );
            this.eventEmitter.emit('payment.webhook.success', {
              paymentReference: payment.reference,
            });
            this.publishPaymentEvent('PaymentSucceeded', {
              status: PaymentStatus.SUCCESS,
              message: 'Payment successful via webhook',
              reference: payment.reference,
              gatewayResponse: verificationResult.gatewayResponse,
            });
          } else {
            payment.status = PaymentStatus.FAILED;
            await transactionalEntityManager
              .getRepository(Payment)
              .save(payment);

            const transactionEntity = payment.transactions[0];
            if (transactionEntity) {
              transactionEntity.status = PaymentStatus.FAILED;
              transactionEntity.gatewayResponse =
                verificationResult.gatewayResponse;
              await transactionalEntityManager
                .getRepository(Transaction)
                .save(transactionEntity);
            }
            this.logger.warn(
              `Paystack verification failed for reference: ${paystackReference}. Webhook event marked as failed.`,
            );
            this.eventEmitter.emit('payment.webhook.failed', {
              paymentReference: payment.reference,
            });
            this.publishPaymentEvent('PaymentFailed', {
              status: PaymentStatus.FAILED,
              message: 'Payment verification failed via webhook',
              reference: payment.reference,
              gatewayResponse: verificationResult.gatewayResponse,
            });
            throw new Error(
              `Paystack verification failed for reference: ${paystackReference}`,
            );
          }
        } else if (
          event.event === 'transaction.failed' ||
          event.event === 'charge.failed'
        ) {
          const paystackReference = event.data.reference;
          const payment = await transactionalEntityManager
            .getRepository(Payment)
            .findOne({
              where: { reference: paystackReference },
              relations: ['transactions'],
            });

          if (payment) {
            payment.status = PaymentStatus.FAILED;
            await transactionalEntityManager
              .getRepository(Payment)
              .save(payment);
            const transactionEntity = payment.transactions[0];
            if (transactionEntity) {
              transactionEntity.status = PaymentStatus.FAILED;
              transactionEntity.gatewayResponse = event.data;
              await transactionalEntityManager
                .getRepository(Transaction)
                .save(transactionEntity);
            }
            this.logger.warn(
              `Paystack transaction failed (webhook event) for reference: ${paystackReference}. Payment marked as failed.`,
            );
            this.eventEmitter.emit('payment.webhook.failed', {
              paymentReference: payment.reference,
            });
            this.publishPaymentEvent('PaymentFailed', {
              status: PaymentStatus.FAILED,
              message: `Payment failed via webhook event: ${event.event}`,
              reference: payment.reference,
              gatewayResponse: event.data,
            });
          } else {
            this.logger.warn(
              `Payment record not found for failed webhook event, reference: ${paystackReference}`,
            );
          }
        } else {
          this.logger.log(`Ignoring Paystack webhook event: ${event.event}`);
        }
      } catch (error) {
        this.logger.error(
          'Error processing Paystack webhook event:',
          error.stack,
        );
        throw error;
      }
    });
  }

  async verifyTransactionWithPaystack(
    reference: string,
  ): Promise<PaymentResponse> {
    try {
      const response = await this.httpService
        .get(`${this.paystackVerifyTransactionUrl}/${reference}`, {
          headers: { Authorization: `Bearer ${this.paystackSecretKey}` },
        })
        .toPromise();

      if (response.data.status) {
        return {
          status: PaymentStatus.SUCCESS,
          message: 'Paystack transaction verified',
          reference: reference,
          gatewayResponse: response.data.data,
        };
      } else {
        return {
          status: PaymentStatus.FAILED,
          message: 'Paystack transaction verification failed',
          reference: reference,
          gatewayResponse: response.data,
        };
      }
    } catch (error) {
      this.logger.error(
        `Error verifying transaction with Paystack API for reference ${reference}:`,
        error.stack,
      );
      return {
        status: PaymentStatus.FAILED,
        message: 'Error verifying transaction with Paystack API',
        reference: reference,
        gatewayResponse: error.message,
      };
    }
  }

  verifyPaystackWebhookSignature(
    rawBody: string,
    signature: string,
    webhookSecret: string,
  ): boolean {
    const hmac = crypto.createHmac('sha512', webhookSecret);
    hmac.update(rawBody);
    const generatedSignature = hmac.digest('hex');
    return generatedSignature === signature;
  }

  private async initializePaystackTransaction(
    paymentDto: ProcessPaymentDto,
    ourReference: string,
  ): Promise<PaymentResponse> {
    try {
      const response = await axios.post(
        this.paystackInitializeTransactionUrl,
        {
          amount: paymentDto.amount,
          email: paymentDto.email,
          currency: paymentDto.currency,
          reference: ourReference,
        },
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (response.data.status) {
        return {
          status: PaymentStatus.PENDING,
          message:
            'Paystack transaction initialized, waiting for webhook confirmation',
          reference: response.data.data.reference,
          gatewayResponse: response.data,
        };
      } else {
        return {
          status: PaymentStatus.FAILED,
          message: 'Paystack transaction initialization failed',
          reference: response.data.data?.reference || 'REF_INIT_FAILED',
          gatewayResponse: response.data,
        };
      }
    } catch (error) {
      this.logger.error(
        'Error initializing Paystack transaction:',
        error.stack,
      );
      return {
        status: PaymentStatus.FAILED,
        message: 'Error initializing Paystack transaction',
        reference: 'REF_PAYSTACK_INIT_ERROR',
        gatewayResponse: error.message,
      };
    }
  }

  private async publishPaymentEvent(
    eventName: 'PaymentSucceeded' | 'PaymentFailed',
    paymentResponse: PaymentResponse,
  ): Promise<void> {
    const channel = 'payment-events';
    const message = {
      event: eventName,
      paymentReference: paymentResponse.reference,
      paymentStatus: paymentResponse.status,
      paymentMessage: paymentResponse.message,
      timestamp: new Date().toISOString(),
    };

    await this.redisService.publish(channel, JSON.stringify(message));
    this.logger.log(
      `Published ${eventName} event to Redis channel "${channel}":`,
      message,
    );
  }

  private generateReference(): string {
    return `STKREF-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
  }

  async findPaymentByReference(
    reference: string,
  ): Promise<Payment | undefined> {
    return this.paymentRepository.findOne({ where: { reference } });
  }
}
