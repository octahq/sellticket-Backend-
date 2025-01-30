import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { databaseConfig } from './config/db.config';
import { EventModule } from './event/event.module';
import { CategoryModule } from './category/category.module';
import { CloudinaryProvider } from './cloudinary/cloudinary.provider';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => databaseConfig(configService),
    }),
    EventModule,
    CategoryModule,
  ],
  providers: [CloudinaryProvider],
  exports: [CloudinaryProvider]
})
export class AppModule {}
