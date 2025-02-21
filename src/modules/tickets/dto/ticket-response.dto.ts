import { ApiProperty } from '@nestjs/swagger';
import { TicketType, TokenGatingType, TicketStatus } from '../enums';
import { Expose, Type } from 'class-transformer';
import { EventResponseDto } from 'src/modules/event/dto/EventResponseDto';

export class TicketResponseDto {
  @ApiProperty({ example: 'f195adab-ef7b-47da-99eb-201788f113fd' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'General Admission' })
  @Expose()
  name: string;

  @ApiProperty({ example: TicketType.FREE, enum: TicketType })
  @Expose()
  type: TicketType;

  @ApiProperty({ example: 4, required: false })
  @Expose()
  purchaseLimit?: number;

  @ApiProperty({ example: 100, required: false })
  @Expose()
  quantity?: number;

  @ApiProperty({
    example: 'Access to all general sessions and networking events',
    required: false,
  })
  @Expose()
  description?: string;

  @ApiProperty({ example: '2025-06-01T00:00:00Z', required: false })
  @Expose()
  bookingStartTime?: Date;

  @ApiProperty({ example: '2025-06-10T23:59:59Z', required: false })
  @Expose()
  bookingEndTime?: Date;

  @ApiProperty({ example: false })
  @Expose()
  isResaleEnabled: boolean;

  @ApiProperty({ example: false })
  @Expose()
  isApprovalRequired: boolean;

  @ApiProperty({ example: false })
  @Expose()
  isGroupTicket: boolean;

  @ApiProperty({ example: TicketStatus.AVAILABLE, enum: TicketStatus })
  @Expose()
  status: TicketStatus;

  @ApiProperty({ example: 2 })
  @Expose()
  eventId: number;

  @ApiProperty({ example: null, enum: TokenGatingType, required: false })
  @Expose()
  tokenGatingType?: TokenGatingType;

  @ApiProperty({ example: null, required: false })
  @Expose()
  basePrice?: number;

  @ApiProperty({ example: null, required: false })
  @Expose()
  contractAddress?: string;

  @ApiProperty({ example: null, required: false })
  @Expose()
  maxResellPrice?: number;

  @ApiProperty({ example: null, required: false })
  @Expose()
  groupSize?: number;

  @ApiProperty({ example: '2025-02-01T16:11:45.292Z' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ example: '2025-02-01T16:11:45.292Z' })
  @Expose()
  updatedAt: Date;

  @ApiProperty({ type: () => EventResponseDto })
  @Type(() => EventResponseDto)
  @Expose()
  event: EventResponseDto;
}
