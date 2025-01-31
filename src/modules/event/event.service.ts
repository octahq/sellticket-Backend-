import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from './entities/event.entity';
import { Category } from '../category/entities/category.entity';
import { CloudinaryProvider } from 'src/modules/cloudinary/cloudinary.provider';

@Injectable()
export class EventService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,

    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    private readonly cloudinaryProvider: CloudinaryProvider,
  ) {}

  async create(
    createEventDto: CreateEventDto,
    file?: Express.Multer.File,
  ): Promise<{
    statusCode: number;
    success: boolean;
    message: string;
    data: Event;
  }> {
    const {
      name,
      description,
      startDate,
      endDate,
      timeZone,
      locationType,
      location,
      guestPaysFees,
      categoryId,
      additionalInfo,
    } = createEventDto;

    // Ensure the category exists
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId },
    });
    if (!category)
      throw new NotFoundException(`Category with ID ${categoryId} not found`);

    // Upload image if provided
    const imageUrl = file
      ? await this.cloudinaryProvider.uploadImage(file)
      : undefined;

    // Create event entity
    const event = this.eventRepository.create({
      name,
      description,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      timeZone,
      locationType,
      location: locationType !== 'undisclosed' ? location : null,
      guestPaysFees,
      category,
      imageUrl,
      additionalInfo,
    });

    await this.eventRepository.save(event);

    return {
      statusCode: HttpStatus.CREATED,
      success: true,
      message: 'Event created successfully',
      data: event,
    };
  }

  findAll() {
    return `This action returns all event`;
  }

  findOne(id: number) {
    return `This action returns a #${id} event`;
  }

  update(id: number, updateEventDto: UpdateEventDto) {
    return `This action updates a #${id} event`;
  }

  remove(id: number) {
    return `This action removes a #${id} event`;
  }
}
