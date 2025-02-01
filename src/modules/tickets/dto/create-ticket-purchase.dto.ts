import {
  IsString,
  IsNumber,
  IsOptional,
  IsEmail,
  IsUUID,
  Min,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTicketPurchaseDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'UUID of the ticket being purchased',
  })
  @IsUUID()
  ticketId: string;

  @ApiProperty({
    example: 2,
    description: 'Number of tickets to purchase',
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'Email address of the buyer',
  })
  @IsEmail()
  buyerEmail: string;

  @ApiProperty({
    example: 'John',
    description: 'First name of the buyer',
  })
  @IsString()
  buyerFirstName: string;

  @ApiProperty({
    example: 'Doe',
    description: 'Last name of the buyer',
  })
  @IsString()
  buyerLastName: string;

  @ApiPropertyOptional({
    example: { specialRequests: 'Wheelchair access' },
    description: 'Additional information for the purchase',
  })
  @IsObject()
  @IsOptional()
  additionalInfo?: Record<string, any>;
}
