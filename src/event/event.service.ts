import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from './entities/event.entity';
import { Category } from 'src/category/entities/category.entity';
import { CloudinaryProvider } from 'src/cloudinary/cloudinary.provider';

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
  ) {
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

    const category = await this.categoryRepository.findOne({
      where: { id: categoryId },
    });
    if (!category) {
      throw new NotFoundException(`Category with ID ${categoryId} not found`);
    }

    let imageUrl: string | undefined;
    if (file) {
      imageUrl = await this.cloudinaryProvider.uploadImage(file); // Upload & get URL
    }

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
