import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  Logger,
} from '@nestjs/common';
import { SentryExceptionCaptured } from '@sentry/nestjs';
import { Response } from 'express';
import { Prisma } from 'src/generated/prisma/client';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaErrorsFilter implements ExceptionFilter {
  logger = new Logger(PrismaErrorsFilter.name);

  @SentryExceptionCaptured()
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = 500;
    let message = 'Internal server error';

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // P2003: Foreign key constraint violation - record cannot be deleted
      // because other records depend on it via a Restrict on-delete policy.
      if (exception.code === 'P2003') {
        status = 409;
        const relation = this.parseRelationFromConstraint(
          exception.meta?.field_name as string | undefined,
        );
        message = relation
          ? `This record cannot be deleted because it has related ${relation}`
          : 'This record cannot be deleted because other records depend on it';
      }

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

  /**
   * Extracts a human-readable relation name from a Prisma constraint name.
   * e.g. "Site_parentSiteId_fkey" -> "sites"
   *      "Asset_siteId_fkey" -> "assets"
   */
  private parseRelationFromConstraint(
    constraintName: string | undefined,
  ): string | null {
    if (!constraintName) return null;

    // Prisma constraint format: "ModelName_fieldName_fkey"
    const match = constraintName.match(/^([A-Z][a-zA-Z]*)_/);
    if (!match) return null;

    const modelName = match[1];
    // Convert PascalCase to a readable plural lowercase form
    // e.g. "Site" -> "sites", "InspectionRoute" -> "inspection routes"
    const words = modelName.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
    return words.endsWith('s') ? words : `${words}s`;
  }
}
