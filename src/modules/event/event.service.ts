import { ConflictException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
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

  
  /**
 * @service Event Creation Service
 * ----------------------------------------
 * This service is responsible for handling the creation of new events in the system.
 * It ensures that all necessary data is validated and processed efficiently before 
 * saving the event to the database. The key operations in this service include:
 * 
 * 1️⃣ **Category Validation**:
 *    - Ensures that the provided `categoryId` exists in the system.
 *    - Uses `findOneOrFail()` to fetch the category and throws a `NotFoundException` 
 *      if the category does not exist.
 * 
 * 2️⃣ **Duplicate Event Handling**:
 *    - If `allowDuplicate` is `false`, the system checks whether an event with the 
 *      same `name`, `startDate`, and `categoryId` already exists.
 *    - If a duplicate is found, it throws a `ConflictException` to prevent duplicate entries.
 * 
 * 3️⃣ **Image Upload**:
 *    - If an image file is provided, it is uploaded using `cloudinaryProvider.uploadImage()`.
 *    - The returned URL is stored in the event record.
 * 
 * 4️⃣ **Event Data Processing & Storage**:
 *    - Converts `startDate` and `endDate` into valid Date objects for consistent formatting.
 *    - Ensures that if `locationType` is set to `"undisclosed"`, the `location` field is set to `null`.
 *    - Creates a new event entity with all required fields and saves it to the database.
 * 
 * 5️⃣ **Performance Optimization**:
 *    - Uses `Promise.all()` to fetch category data and check for duplicate events in parallel,
 *      reducing database query execution time.
 * 
 * @param {CreateEventDto} createEventDto - The DTO containing event details.
 * @param {Express.Multer.File} [file] - An optional file representing the event's image.
 * @returns {Promise<{statusCode: number; success: boolean; message: string; data: Event;}>}
 * - If the event is successfully created, it returns the event details.
 * - If any validation or duplicate check fails, appropriate exceptions are thrown.
 */
  async create(
    createEventDto: CreateEventDto,
    file?: Express.Multer.File
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
      allowDuplicate,
      isDraft
    } = createEventDto;

    const formattedStartDate = new Date(startDate);
    const formattedendDate = new Date(endDate);
  
    const [category, existingEvent] = await Promise.all([
      this.categoryRepository.findOneOrFail({
        where: { id: categoryId },
      }).catch(() => {
        throw new NotFoundException(`Category with ID ${categoryId} not found`);
      }),
  
      allowDuplicate
        ? null
        : this.eventRepository.findOne({
            where: { name, startDate: formattedStartDate, category: { id: categoryId } },
            relations: ["category"],
          }),
    ]);
  
    if (existingEvent) {
      throw new ConflictException("An event with the same name, start date, and category already exists.");
    }


    const imageUrl = file ? await this.cloudinaryProvider.uploadImage(file) : undefined;
  
    const event = this.eventRepository.create({
      name,
      description,
      startDate: formattedStartDate,
      endDate: formattedendDate,
      timeZone,
      locationType,
      location: locationType !== "undisclosed" ? location : null,
      guestPaysFees,
      category,
      imageUrl,
      additionalInfo,
      isDraft
    });
  
    await this.eventRepository.save(event);
  
    return {
      statusCode: HttpStatus.CREATED,
      success: true,
      message: "Event created successfully",
      data: event,
    };
  }  

  findAll() {
    // TODO: Implement the logic to fetch all events from the database
    
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
