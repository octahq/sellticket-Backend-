import { ApiProperty } from '@nestjs/swagger';
import { PurchaseStatus } from '../enums';
import { TicketResponseDto } from 'src/modules/tickets/dto/ticket-response.dto';

export class TicketPurchaseResponseDto {
  @ApiProperty({ example: '446ab5c3-ec08-4e6e-95f5-1844c1d85eb4' })
  id: string;

  @ApiProperty({ example: 2 })
  quantity: number;

  @ApiProperty({ example: 'john.doe@example.com' })
  buyerEmail: string;

  @ApiProperty({ example: 'John' })
  buyerFirstName: string;

  @ApiProperty({ example: 'Doe' })
  buyerLastName: string;

  @ApiProperty({
    example: { specialRequests: 'Wheelchair access' },
    nullable: true,
  })
  additionalInfo?: Record<string, any>;

  @ApiProperty({ enum: PurchaseStatus, example: PurchaseStatus.PENDING })
  status: PurchaseStatus;

  @ApiProperty({ type: TicketResponseDto })
  ticket: TicketResponseDto;

  @ApiProperty({ example: '2025-02-02T10:42:41.515Z' })
  createdAt: Date;

  @ApiProperty({ example: '2025-02-02T10:42:41.515Z' })
  updatedAt: Date;
}
