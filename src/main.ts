import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { TransformInterceptor } from './common/interceptors';
import { HttpExceptionFilter } from './common/filters';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import * as dotenv from 'dotenv';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('NestApplication');
  try {
    app.enableCors();
    app.useGlobalPipes(new ValidationPipe());
    app.useGlobalInterceptors(new TransformInterceptor());
    app.useGlobalFilters(new HttpExceptionFilter());

    app.setGlobalPrefix('/api/v1');


    // Swagger configuration
    const config = new DocumentBuilder()
      .setTitle('Event Management API')
      .setDescription('API documentation for the Event Management system')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);


    const configService = app.get(ConfigService);

    const port = parseInt(configService.get<string>('PORT') || '3000', 10);

    if (isNaN(port) || port <= 0 || port > 65535) {
      throw new Error(`Invalid PORT value: ${port}`);
    }
    await app.listen(port);

    logger.log(`Application is running on: ${await app.getUrl()}`);
    logger.log(`Swagger documentation available at: ${await app.getUrl()}/api`);
  } catch (error) {
    logger.error(`Failed to start the application: ${error.message}`);
    process.exit(1);
  }
}
bootstrap();
