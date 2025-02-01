import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class CategoryResponseDto {
  @ApiProperty({ example: 1 })
  @Expose()
  id: number;

  @ApiProperty({ example: 'Music' })
  @Expose()
  name: string;

  @ApiProperty({ example: 'music' })
  @Expose()
  slug: string;

  @ApiProperty({ example: '2025-02-01T15:55:04.884Z' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ example: '2025-02-01T15:55:04.884Z' })
  @Expose()
  updatedAt: Date;
}
