import { Module, OnModuleInit } from '@nestjs/common';
import { EventService } from './event.service';
import { EventController } from './event.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from '../category/entities/category.entity';
import { CloudinaryProvider } from '../cloudinary/cloudinary.provider';
import { Event } from './entities/event.entity';
import { QueueModule } from '../queue/queue.module';
import { QueueService } from '../queue/queue.service';
import { scheduleDraftCleanup } from './event.cleanup';

@Module({
  imports: [
    TypeOrmModule.forFeature([Event, Category]), QueueModule
  ],
  controllers: [EventController],
  providers: [EventService, CloudinaryProvider],
  exports: [EventService],
})
export class EventModule implements OnModuleInit {
  constructor(private readonly queueService: QueueService) {}

  onModuleInit() {
    scheduleDraftCleanup(this.queueService); // ✅ Injected queue service
  }
}
