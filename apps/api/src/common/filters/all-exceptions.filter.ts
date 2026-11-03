import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { ApiErrorBody, ApiResponse } from '@job-hunter/shared';

/**
 * Converts any thrown error into the shared error envelope. Unknown errors are
 * logged server-side and returned as a generic 500 so internals (stack traces,
 * Prisma messages, SQL) never leak to clients.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, error } = this.resolve(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} -> ${status}: ${
          exception instanceof Error ? exception.message : String(exception)
        }`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json({
      success: false,
      data: null,
      error,
    } satisfies ApiResponse<never>);
  }

  private resolve(exception: unknown): { status: number; error: ApiErrorBody } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      const message =
        typeof payload === 'string'
          ? payload
          : ((payload as { message?: string | string[] }).message ?? exception.message);
      return {
        status,
        error: {
          code: this.codeForStatus(status),
          message: Array.isArray(message) ? message.join('; ') : message,
          details: Array.isArray(message) ? message : undefined,
        },
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.resolvePrisma(exception);
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        error: { code: 'VALIDATION_ERROR', message: 'The request data was not valid.' },
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong on our side.' },
    };
  }

  private resolvePrisma(exception: Prisma.PrismaClientKnownRequestError): {
    status: number;
    error: ApiErrorBody;
  } {
    switch (exception.code) {
      case 'P2002': {
        const target = (exception.meta?.target as string[] | undefined)?.join(', ');
        return {
          status: HttpStatus.CONFLICT,
          error: {
            code: 'CONFLICT',
            message: target ? `A record with this ${target} already exists.` : 'Record already exists.',
          },
        };
      }
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          error: { code: 'NOT_FOUND', message: 'The requested record was not found.' },
        };
      default:
        return {
          status: HttpStatus.BAD_REQUEST,
          error: { code: 'DATABASE_ERROR', message: 'The database rejected this request.' },
        };
    }
  }

  private codeForStatus(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'RATE_LIMITED';
      case HttpStatus.PAYLOAD_TOO_LARGE:
        return 'PAYLOAD_TOO_LARGE';
      default:
        return status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR';
    }
  }
}
