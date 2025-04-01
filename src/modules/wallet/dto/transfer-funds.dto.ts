import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class TransferFundsDto {
  @ApiProperty({
    description: 'Source wallet address',
    example: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  })
  @IsString()
  @IsNotEmpty()
  fromAddress: string;

  @ApiProperty({
    description: 'Destination wallet address',
    example: '0x742d35Cc6634C0532925a3b844Bc454e4438f44f',
  })
  @IsString()
  @IsNotEmpty()
  toAddress: string;

  @ApiProperty({
    description: 'Amount to transfer in ETH',
    example: 0.1,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  amount: number;
}
