import { IsNumber, IsUUID, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTicketResaleDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'UUID of the ticket being resold',
  })
  @IsUUID()
  ticketId: string;

  @ApiProperty({
    example: 150.0,
    description: 'Price at which the ticket is being resold',
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  resalePrice: number;
}
