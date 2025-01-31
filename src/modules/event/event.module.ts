import { Module } from '@nestjs/common';
import { EventService } from './event.service';
import { EventController } from './event.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from '../category/entities/category.entity';
import { CloudinaryProvider } from 'src/modules/cloudinary/cloudinary.provider';
import { Event } from './entities/event.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Event, Category]),
  ],
  controllers: [EventController],
  providers: [EventService, CloudinaryProvider],
  exports: [EventService],
})
export class EventModule {}
