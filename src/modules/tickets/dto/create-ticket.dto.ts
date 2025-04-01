import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsDateString,
  Min,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketType, TokenGatingType } from '../enums';

export class CreateTicketDto {
  @ApiProperty({ example: 'VIP Pass', description: 'Name of the ticket' })
  @IsString()
  name: string;

  @ApiProperty({
    enum: TicketType,
    example: TicketType.PAID,
    description: 'Type of ticket (FREE, PAID, or TOKEN_GATED)',
  })
  @IsEnum(TicketType)
  type: TicketType;

  @ApiPropertyOptional({
    enum: TokenGatingType,
    description: 'Type of token gating if ticket is token-gated',
  })
  @ValidateIf((o) => o.type === TicketType.TOKEN_GATED)
  @IsEnum(TokenGatingType)
  @IsOptional()
  tokenGatingType?: TokenGatingType;

  @ApiPropertyOptional({
    example: 99.99,
    description: 'Base price for paid tickets',
    minimum: 0,
  })
  @ValidateIf((o) => o.type === TicketType.PAID)
  @IsNumber()
  @Min(0)
  basePrice?: number;

  @ApiPropertyOptional({
    example: '0x1234...5678',
    description: 'Smart contract address for token-gated tickets',
  })
  @ValidateIf((o) => o.type === TicketType.TOKEN_GATED)
  @IsString()
  @IsOptional()
  contractAddress?: string;

  @ApiPropertyOptional({
    example: 4,
    description: 'Maximum number of tickets per purchase',
    minimum: 1,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  purchaseLimit?: number;

  @ApiProperty({
    example: 100,
    description: 'Total number of tickets available',
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({
    example: 'Access to VIP area and complimentary drinks',
    description: 'Detailed description of the ticket',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: '2024-12-31T00:00:00Z',
    description: 'When ticket sales begin',
  })
  @IsDateString()
  @IsOptional()
  bookingStartTime?: Date;

  @ApiPropertyOptional({
    example: '2024-12-31T23:59:59Z',
    description: 'When ticket sales end',
  })
  @IsDateString()
  @IsOptional()
  bookingEndTime?: Date;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether ticket can be resold',
  })
  @IsBoolean()
  @IsOptional()
  isResaleEnabled?: boolean;

  @ApiPropertyOptional({
    example: 150,
    description: 'Maximum allowed resale price',
    minimum: 0,
  })
  @ValidateIf((o) => o.isResaleEnabled === true)
  @IsNumber()
  @Min(0)
  maxResellPrice?: number;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether organizer approval is required for purchase',
  })
  @IsBoolean()
  @IsOptional()
  isApprovalRequired?: boolean;

  @ApiProperty({
    example: false,
    description: 'Whether this is a group ticket',
  })
  @IsBoolean()
  isGroupTicket: boolean;

  @ApiPropertyOptional({
    example: 5,
    description: 'Number of people in a group ticket',
    minimum: 2,
  })
  @ValidateIf((o) => o.isGroupTicket === true)
  @IsNumber()
  @Min(2)
  groupSize?: number;

  @ApiProperty({
    example: '1',
    description: 'Id of the event this ticket belongs to',
  })
  @IsNumber()
  eventId: number;
}
