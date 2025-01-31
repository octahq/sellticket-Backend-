import { 
    IsString, IsNotEmpty, IsOptional, IsEnum, 
    IsBoolean, IsDateString, IsUrl, ValidateIf, 
    Validate 
  } from 'class-validator';
  import { LocationType } from '../entities/event.entity';
  import { isValidTimeZone } from '../validators/timezone.validator';
  import { IsEndDateAfterStartDate, IsFutureDate } from '../validators/date.validator';
  
  export class CreateEventDto {
    @IsString()
    @IsNotEmpty()
    name: string;
  
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    description: string;
  
    @IsDateString()
    @IsNotEmpty()
    @Validate(IsFutureDate)
    startDate: string;
  
    @IsDateString()
    @IsNotEmpty()
    @Validate(IsEndDateAfterStartDate, ['startDate']) // ✅ Ensures endDate is after startDate
    endDate: string;
  
    @IsString()
    @IsNotEmpty()
    @Validate(isValidTimeZone) // ✅ Ensures timezone is valid
    timeZone: string;
  
    @IsEnum(LocationType)
    @IsNotEmpty()
    locationType: LocationType;
  
    @ValidateIf(o => o.locationType !== LocationType.Undisclosed) // ✅ Enforce location if physical or virtual
    @IsNotEmpty({ message: 'Location is required for physical or virtual events' })
    @IsString()
    @Validate(o => {
      if (o.locationType === LocationType.Virtual) {
        return /^https?:\/\/.+$/.test(o.location); // ✅ Custom Regex for URL validation
      }
      return true;
    }, { message: 'Location must be a valid URL for virtual events' })
    location?: string;
  
    @IsOptional()
    @IsString()
    additionalInfo?: string;
  
    @IsBoolean()
    @IsNotEmpty()
    guestPaysFees: boolean;
  
    @IsNotEmpty()
    categoryId: number; // Category ID to link the event
  }
  