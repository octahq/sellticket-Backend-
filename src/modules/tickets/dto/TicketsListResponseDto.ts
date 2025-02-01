import { ApiProperty } from '@nestjs/swagger';
import { TicketResponseDto } from './ticket-response.dto';
import { Expose, Type } from 'class-transformer';

export class TicketsListResponseDto {
  @ApiProperty({ example: true })
  @Expose()
  success: boolean;

  @ApiProperty({ type: () => [TicketResponseDto] })
  @Type(() => TicketResponseDto)
  @Expose()
  data: TicketResponseDto[];

  @ApiProperty({ example: 'Tickets retrieved successfully' })
  @Expose()
  message: string;
}
