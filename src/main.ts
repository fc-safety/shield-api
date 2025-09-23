import { LogLevel } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { WsAdapter } from '@nestjs/platform-ws';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { patchNestJsSwagger, ZodValidationPipe } from 'nestjs-zod';
import { AppModule } from './app.module';
import { StatelessUser } from './auth/user.schema';
import { PrismaErrorsFilter } from './common/prisma-errors.filter';
import { ApiConfigService } from './config/api-config.service';

declare module 'express' {
  export interface Request {
    user?: StatelessUser;
  }
}

const getLogLevels = (): LogLevel[] => {
  const logLevel = process.env.LOG_LEVEL?.toLowerCase() ?? 'error';

  const logLevels: LogLevel[] = ['fatal'];
  if (logLevel === 'fatal') return logLevels;

  logLevels.push('error');
  if (logLevel === 'error') return logLevels;

  logLevels.push('warn');
  if (logLevel === 'warn') return logLevels;

  logLevels.push('log');
  if (logLevel === 'log' || logLevel === 'info') return logLevels;

  logLevels.push('debug');
  if (logLevel === 'debug') return logLevels;

  logLevels.push('verbose');
  return logLevels;
};

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: getLogLevels(),
  });

  // As of Express 5, the default query parser is 'simple'.
  app.set('query parser', 'extended');

  const config = app.get(ApiConfigService);

  app.enableCors({
    origin: [/http:\/\/localhost:\d+/, ...config.get('CORS_ALLOWED_ORIGINS')],
  });

  // Enable global query & body validation.
  app.useGlobalPipes(new ZodValidationPipe());

  // Filter and translate Prisma errors.
  app.useGlobalFilters(new PrismaErrorsFilter());

  // Enable OpenAPI documentation.
  patchNestJsSwagger();
  const openApiConfig = new DocumentBuilder()
    .setTitle('Shield API')
    .setDescription('OpenAPI documentation for the Shield API.')
    .setVersion('1.0')
    .build();
  const documentFactory = () =>
    SwaggerModule.createDocument(app, openApiConfig);
  SwaggerModule.setup('api-docs', app, documentFactory);

  app.useWebSocketAdapter(new WsAdapter(app));

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
