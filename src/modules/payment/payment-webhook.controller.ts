import { Controller, Post, Headers, RawBodyRequest, Req, BadRequestException, Logger, HttpCode, HttpStatus } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Controller('payment/webhook') // Define webhook endpoint
export class PaymentWebhookController {
  private readonly logger = new Logger(PaymentWebhookController.name);

  constructor(
    private readonly paymentService: PaymentService,
    private readonly configService: ConfigService,
  ) {}

  @Post('paystack') // Specific webhook path for Paystack
  @HttpCode(HttpStatus.OK) // Paystack expects 200 OK on webhook success
  async handlePaystackWebhook(
    @Headers('x-paystack-signature') paystackSignature: string,
    @Req() req: RawBodyRequest<Request>, // To access raw request body for signature verification
  ): Promise<void> {
    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new BadRequestException('No request body provided');
    }

    if (!paystackSignature) {
      throw new BadRequestException('No Paystack signature header');
    }

    const webhookSecret = this.configService.get<string>('payment.paystackWebhookSecret');
    if (!webhookSecret) {
      this.logger.error('Paystack webhook secret is not configured.');
      throw new Error('Webhook secret not configured'); // Or handle appropriately
    }

    try {
      const isValidSignature = this.paymentService.verifyPaystackWebhookSignature(
        rawBody.toString(),
        paystackSignature,
        webhookSecret,
      );

      if (!isValidSignature) {
        this.logger.warn('Invalid Paystack webhook signature.');
        throw new BadRequestException('Invalid webhook signature');
      }

      const event = JSON.parse(rawBody.toString());
      this.logger.log(`Received Paystack webhook event: ${event.event}`);

      await this.paymentService.processPaystackWebhookEvent(event);

    } catch (error) {
      this.logger.error('Error processing Paystack webhook:', error.stack);
      // Important: Do not re-throw error to Paystack. Return 200 OK to acknowledge receipt,
      // and handle errors internally (e.g., logging, retries).
      // Throwing an error here might cause Paystack to retry indefinitely.
    }
  }
} 