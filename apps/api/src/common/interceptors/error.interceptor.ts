import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AppError, ErrorCode, isAppError } from '../errors';

@Injectable()
export class ErrorInterceptor implements NestInterceptor {
  private readonly logger = new Logger('ErrorInterceptor');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError(error => {
        const request = context.switchToHttp().getRequest();
        const correlationId = this.generateCorrelationId();

        // Add correlation ID to request for tracing
        request.correlationId = correlationId;

        // Handle AppError instances
        if (isAppError(error)) {
          this.logAppError(error, request);
          return throwError(() => error);
        }

        // Handle existing HttpExceptions
        if (error instanceof HttpException) {
          this.logHttpException(error, request, correlationId);
          return throwError(() => error);
        }

        // Handle database-specific errors
        const dbError = this.handleDatabaseError(error);
        if (dbError) {
          this.logAppError(dbError, request);
          return throwError(() => dbError);
        }

        // Handle validation errors from class-validator
        const validationError = this.handleValidationError(error);
        if (validationError) {
          this.logAppError(validationError, request);
          return throwError(() => validationError);
        }

        // Default: create a system error
        const systemError = AppError.systemError(
          ErrorCode.SYS_001,
          `${request.method} ${request.url}`,
          error,
        );

        this.logAppError(systemError, request);
        return throwError(() => systemError);
      }),
    );
  }

  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private logAppError(error: AppError, request: any): void {
    const logData = {
      ...error.toLogFormat(),
      request: {
        method: request.method,
        url: request.url,
        userAgent: request.headers['user-agent'],
        ip: request.ip,
        body: this.sanitizeRequestBody(request.body),
        query: request.query,
        params: request.params,
      },
    };

    if (error.getStatus() >= 500) {
      this.logger.error('Server error occurred', logData);
    } else if (error.getStatus() >= 400) {
      this.logger.warn('Client error occurred', logData);
    } else {
      this.logger.log('Request completed with error', logData);
    }
  }

  private logHttpException(error: HttpException, request: any, correlationId: string): void {
    const logData = {
      statusCode: error.getStatus(),
      message: error.message,
      response: error.getResponse(),
      correlationId,
      request: {
        method: request.method,
        url: request.url,
        userAgent: request.headers['user-agent'],
        ip: request.ip,
      },
    };

    if (error.getStatus() >= 500) {
      this.logger.error('HTTP exception occurred', logData);
    } else {
      this.logger.warn('HTTP exception occurred', logData);
    }
  }

  private handleDatabaseError(error: any): AppError | null {
    if (!error.code) return null;

    switch (error.code) {
      // PostgreSQL error codes
      case '23505': // unique_violation
        return AppError.databaseError(
          ErrorCode.DB_025,
          'database_constraint_violation',
          error,
          { constraint: 'unique', detail: error.detail },
        );

      case '23503': // foreign_key_violation
        return AppError.databaseError(
          ErrorCode.DB_024,
          'database_constraint_violation',
          error,
          { constraint: 'foreign_key', detail: error.detail },
        );

      case '23514': // check_violation
        return AppError.databaseError(
          ErrorCode.DB_026,
          'database_constraint_violation',
          error,
          { constraint: 'check', detail: error.detail },
        );

      case '08003': // connection_does_not_exist
      case '08006': // connection_failure
        return AppError.databaseError(
          ErrorCode.DB_001,
          'database_connection_failed',
          error,
        );

      case '57014': // query_canceled (timeout)
        return AppError.databaseError(
          ErrorCode.DB_021,
          'database_query_timeout',
          error,
        );

      case '40P01': // deadlock_detected
        return AppError.databaseError(
          ErrorCode.DB_052,
          'database_deadlock',
          error,
        );

      default:
        // Generic database error
        return AppError.databaseError(
          ErrorCode.DB_020,
          'database_query_failed',
          error,
          { pgErrorCode: error.code },
        );
    }
  }

  private handleValidationError(error: any): AppError | null {
    // Handle class-validator errors
    if (error.name === 'ValidationError' || (error.response && error.response.statusCode === 400)) {
      return AppError.validationError(
        ErrorCode.VAL_001,
        error.property || 'unknown',
        error.value,
      );
    }

    // Handle Joi validation errors
    if (error.isJoi) {
      return AppError.validationError(
        ErrorCode.VAL_001,
        error.details?.[0]?.path?.join('.') || 'unknown',
        error.details?.[0]?.context?.value,
      );
    }

    return null;
  }

  private sanitizeRequestBody(body: any): any {
    if (!body) return body;

    // Remove sensitive fields from logs
    const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'authorization'];
    const sanitized = { ...body };

    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}
