import { IsNumber, IsEmail, IsString, IsEnum, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from '../enums/payment-method.enum';

export class ProcessPaymentDto implements PaymentRequest {
  @ApiProperty({ example: 10000, description: 'Amount in kobo/cents' })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ example: 'NGN', description: 'Currency code' })
  @IsString()
  currency: string;

  @ApiProperty({ example: 'user@example.com', description: 'Buyer email' })
  @IsEmail()
  email: string;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.CREDIT_CARD, description: 'Payment method' })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  // ... other fields as needed for payment processing, e.g., card details (handle securely!)
} 