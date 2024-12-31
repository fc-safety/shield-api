import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { Response } from 'express';

@Catch(PrismaClientKnownRequestError)
export class PrismaErrorsFilter implements ExceptionFilter {
  logger = new Logger(PrismaErrorsFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status = 500;
    const message = 'Internal server error';

    if (exception instanceof PrismaClientKnownRequestError) {
      // TODO: This doesn't really work for 404s because there are other types
      // of these that aren't the same as simply a resource wasn't found.
      // if (exception.code === 'P2025') {
      //   status = 404;
      //   message = 'Not found';
      // }
    }

    if (status === 500) {
      this.logger.error(
        'Unknown Prisma error',
        exception.message,
        exception.stack,
      );
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      message,
    });
  }
}
