import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { CategoryResponseDto } from 'src/modules/category/dto/CategoryResponseDto';

export class EventResponseDto {
  @ApiProperty({ example: 2 })
  @Expose()
  id: number;

  @ApiProperty({ example: 'Online AI Workshop' })
  @Expose()
  name: string;

  @ApiProperty({ example: 'Learn about AI from industry experts.' })
  @Expose()
  description: string;

  @ApiProperty({ example: '2025-07-05T13:00:00.000Z' })
  @Expose()
  startDate: Date;

  @ApiProperty({ example: '2025-07-05T17:00:00.000Z' })
  @Expose()
  endDate: Date;

  @ApiProperty({ example: 'UTC' })
  @Expose()
  timeZone: string;

  @ApiProperty({ example: null, required: false })
  @Expose()
  imageUrl?: string;

  @ApiProperty({ example: null, required: false })
  @Expose()
  additionalInfo?: string;

  @ApiProperty({ example: 'virtual' })
  @Expose()
  locationType: string;

  @ApiProperty({ example: 'https://zoom.us/meeting123' })
  @Expose()
  location: string;

  @ApiProperty({ example: false })
  @Expose()
  guestPaysFees: boolean;

  @ApiProperty({ example: '2025-02-01T15:58:29.600Z' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ example: '2025-02-01T15:58:29.600Z' })
  @Expose()
  updatedAt: Date;

  @ApiProperty({ type: () => CategoryResponseDto })
  @Type(() => CategoryResponseDto)
  @Expose()
  category: CategoryResponseDto;
}
