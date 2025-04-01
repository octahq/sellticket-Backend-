// src/auth/dto/session.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, IsString } from 'class-validator';

/**
 * Data Transfer Object for creating a new session
 */
export class CreateSessionDto {
  @ApiProperty({ 
    description: 'Maximum spendable amount in wei (1 ETH = 10^18 wei)',
    example: 1000000000000000000 
  })
  @IsNumber()
  spendLimit: number;

  @ApiProperty({ 
    description: 'Session validity duration in seconds',
    example: 3600 
  })
  @IsNumber()
  validSeconds: number;

  @ApiProperty({
    description: 'List of allowed contract addresses',
    example: ['0xContract1', '0xContract2'],
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  contractAllowList: string[];
}

/**
 * Data Transfer Object for updating session permissions
 */
export class UpdateSessionPermissionsDto {
  @ApiProperty({ 
    description: 'New spend limit in wei',
    example: 2000000000000000000 
  })
  @IsNumber()
  spendLimit: number;
}

/**
 * Data Transfer Object for rotating session keys
 */
export class RotateSessionKeyDto {
  @ApiProperty({ 
    description: 'ID of the session to rotate',
    example: '550e8400-e29b-41d4-a716-446655440000' 
  })
  @IsString()
  sessionId: string;
}