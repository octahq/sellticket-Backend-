import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  ParseFilePipe,
  FileTypeValidator,
  MaxFileSizeValidator,
  UploadedFile,
} from '@nestjs/common';
import { EventService } from './event.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Events')
@Controller('event')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post()
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({ summary: 'Create a new event' }) // Describes the endpoint
  @ApiBearerAuth() // Adds authentication header if required
  @ApiConsumes('multipart/form-data') // Handles file uploads
  @ApiBody({
    description: 'Event creation request',
    type: CreateEventDto,
    required: true,
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Tech Conference 2025' },
        description: { type: 'string', example: 'A global tech event.' },
        startDate: {
          type: 'string',
          format: 'date-time',
          example: '2025-05-20T09:00:00Z',
        },
        endDate: {
          type: 'string',
          format: 'date-time',
          example: '2025-05-21T18:00:00Z',
        },
        timeZone: { type: 'string', example: 'America/New_York' },
        locationType: {
          type: 'string',
          enum: ['undisclosed', 'physical', 'virtual'],
        },
        location: {
          type: 'string',
          example: 'https://zoom.us/j/123456789',
          nullable: true,
        },
        guestPaysFees: { type: 'boolean', example: false },
        categoryId: { type: 'number', example: 1 },
        additionalInfo: {
          type: 'string',
          example: 'Dress code: Business Casual',
          nullable: true,
        },
        image: { type: 'string', format: 'binary' }, // ✅ For file uploads
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Event successfully created' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(
    @Body() createEventDto: CreateEventDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new FileTypeValidator({ fileType: 'image/*' }),
          new MaxFileSizeValidator({ maxSize: 2 * 1024 * 1024 }),
        ],
      }),
    )
    file?: Express.Multer.File, // ✅ Optional file upload
  ) {
    return this.eventService.create(createEventDto, file);
  }

  @Get()
  findAll() {
    return this.eventService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateEventDto: UpdateEventDto) {
    return this.eventService.update(+id, updateEventDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.eventService.remove(+id);
  }
}
