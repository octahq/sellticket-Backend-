import { 
  IsString, IsNotEmpty, IsOptional, IsEnum, 
  IsBoolean, IsDateString, ValidateIf, Validate 
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LocationType } from '../entities/event.entity';
import { isValidTimeZone } from '../validators/timezone.validator';
import { IsEndDateAfterStartDate, IsFutureDate } from '../validators/date.validator';

export class CreateEventDto {
  @ApiProperty({
    description: 'The name of the event',
    example: 'Tech Conference 2025',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'A brief description of the event',
    example: 'A gathering of tech leaders discussing AI trends.',
  })
  @IsString()
  @IsOptional()
  description: string;

  @ApiProperty({
    description: 'The start date and time of the event in ISO 8601 format',
    example: '2025-06-15T10:00:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  @Validate(IsFutureDate) // Ensures startDate is in the future
  startDate: string;

  @ApiProperty({
    description: 'The end date and time of the event in ISO 8601 format',
    example: '2025-06-16T18:00:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  @Validate(IsEndDateAfterStartDate, ['startDate']) // Ensures endDate is after startDate
  endDate: string;

  @ApiProperty({
    description: 'The timezone in which the event is scheduled',
    example: 'America/New_York',
  })
  @IsString()
  @IsNotEmpty()
  @Validate(isValidTimeZone) // Ensures the timezone is valid
  timeZone: string;

  @ApiProperty({
    description: 'The type of event location',
    enum: LocationType,
    example: LocationType.Physical,
  })
  @IsEnum(LocationType)
  @IsNotEmpty()
  locationType: LocationType;

  @ApiPropertyOptional({
    description: 'The event location (required if locationType is not "undisclosed")',
    example: '123 Main Street, New York, NY',
  })
  @ValidateIf(o => o.locationType !== LocationType.Undisclosed) // Location required for physical/virtual
  @IsNotEmpty({ message: 'Location is required for physical or virtual events' })
  @IsString()
  @Validate(o => {
    if (o.locationType === LocationType.Virtual) {
      return /^https?:\/\/.+$/.test(o.location); // Validates as URL for virtual events
    }
    return true;
  }, { message: 'Location must be a valid URL for virtual events' })
  location?: string;

  @ApiPropertyOptional({
    description: 'Additional information about the event',
    example: 'Dress code: Business Casual',
  })
  @IsOptional()
  @IsString()
  additionalInfo?: string;

  @ApiProperty({
    description: 'Indicates whether guests are required to pay fees',
    example: true,
  })
  @IsBoolean()
  @IsNotEmpty()
  guestPaysFees: boolean;

  @ApiProperty({
    description: 'Defines whether duplicate events with the same name, date, and category are allowed',
    example: false,
  })
  @IsBoolean()
  @IsNotEmpty()
  allowDuplicate: boolean;

  @ApiProperty({
    description: 'Indicates whether the event is a draft',
    example: false,
  })
  @IsBoolean()
  @IsNotEmpty()
  isDraft: boolean;

  @ApiProperty({
    description: 'The category ID to which the event belongs',
    example: 3,
  })
  @IsNotEmpty()
  categoryId: number;
}
