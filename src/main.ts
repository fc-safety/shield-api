import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { patchNestJsSwagger, ZodValidationPipe } from 'nestjs-zod';
import { AppModule } from './app.module';
import { StatelessUser } from './auth/user.schema';
import { PrismaErrorsFilter } from './common/prisma-errors.filter';

declare module 'express' {
  export interface Request {
    user?: StatelessUser;
  }
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Enable global query & body validation.
  app.useGlobalPipes(new ZodValidationPipe());

  // Filter and translate Prisma errors.
  app.useGlobalFilters(new PrismaErrorsFilter());

  // Enable OpenAPI documentation.
  patchNestJsSwagger();
  const config = new DocumentBuilder()
    .setTitle('Shield API')
    .setDescription('OpenAPI documentation for the Shield API.')
    .setVersion('1.0')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, documentFactory);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
