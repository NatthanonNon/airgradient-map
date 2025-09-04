import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from './error-codes.enum';
import { ERROR_MESSAGES, ERROR_HTTP_STATUS } from './error-messages';

/**
 * Custom application error class that provides centralized error handling
 */
export class AppError extends HttpException {
  public readonly code: ErrorCode;
  public readonly operation?: string;
  public readonly parameters?: Record<string, any>;
  public readonly originalError?: Error;
  public readonly timestamp: string;
  public readonly correlationId?: string;

  constructor(
    code: ErrorCode,
    options?: {
      operation?: string;
      parameters?: Record<string, any>;
      originalError?: Error;
      correlationId?: string;
      customMessage?: string;
      customHttpStatus?: HttpStatus;
    },
  ) {
    const message = options?.customMessage || ERROR_MESSAGES[code] || 'Unknown error occurred';
    const httpStatus = options?.customHttpStatus || ERROR_HTTP_STATUS[code] || HttpStatus.INTERNAL_SERVER_ERROR;

    // Create structured error response
    const errorResponse = {
      statusCode: httpStatus,
      message,
      error: HttpStatus[httpStatus] || 'Unknown Error',
      code,
      timestamp: new Date().toISOString(),
      ...(options?.operation && { operation: options.operation }),
      ...(options?.parameters && { parameters: options.parameters }),
      ...(options?.correlationId && { correlationId: options.correlationId }),
      ...(process.env.NODE_ENV !== 'production' && options?.originalError && {
        originalError: {
          message: options.originalError.message,
          stack: options.originalError.stack,
        },
      }),
    };

    super(errorResponse, httpStatus);

    this.code = code;
    this.operation = options?.operation;
    this.parameters = options?.parameters;
    this.originalError = options?.originalError;
    this.timestamp = errorResponse.timestamp;
    this.correlationId = options?.correlationId;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * Factory methods for common error scenarios
   */

  // Database errors
  static databaseError(code: ErrorCode, operation: string, originalError: Error, parameters?: Record<string, any>): AppError {
    return new AppError(code, {
      operation,
      originalError,
      parameters,
    });
  }

  // Validation errors
  static validationError(code: ErrorCode, field?: string, value?: any): AppError {
    return new AppError(code, {
      operation: 'validation',
      parameters: { field, value },
    });
  }

  // Business logic errors
  static businessError(code: ErrorCode, operation: string, parameters?: Record<string, any>): AppError {
    return new AppError(code, {
      operation,
      parameters,
    });
  }

  // External service errors
  static externalServiceError(code: ErrorCode, service: string, originalError?: Error): AppError {
    return new AppError(code, {
      operation: `external_service_${service}`,
      originalError,
      parameters: { service },
    });
  }

  // Authentication errors
  static authenticationError(code: ErrorCode, context?: string): AppError {
    return new AppError(code, {
      operation: 'authentication',
      parameters: { context },
    });
  }

  // System errors
  static systemError(code: ErrorCode, operation?: string, originalError?: Error): AppError {
    return new AppError(code, {
      operation: operation || 'system',
      originalError,
    });
  }

  /**
   * Check if error is of specific type
   */
  isCode(code: ErrorCode): boolean {
    return this.code === code;
  }

  isCodeType(prefix: string): boolean {
    return this.code.startsWith(prefix);
  }

  isDatabaseError(): boolean {
    return this.isCodeType('DB_');
  }

  isValidationError(): boolean {
    return this.isCodeType('VAL_');
  }

  isAuthenticationError(): boolean {
    return this.isCodeType('AUTH_');
  }

  isBusinessError(): boolean {
    return this.isCodeType('BIZ_');
  }

  isExternalError(): boolean {
    return this.isCodeType('EXT_');
  }

  isSystemError(): boolean {
    return this.isCodeType('SYS_');
  }

  /**
   * Convert to loggable format
   */
  toLogFormat(): Record<string, any> {
    return {
      code: this.code,
      message: this.message,
      httpStatus: this.getStatus(),
      operation: this.operation,
      parameters: this.parameters,
      timestamp: this.timestamp,
      correlationId: this.correlationId,
      ...(this.originalError && {
        originalError: {
          message: this.originalError.message,
          name: this.originalError.name,
          stack: this.originalError.stack,
        },
      }),
    };
  }

  /**
   * Convert to client-safe format (removes sensitive information)
   */
  toClientFormat(): Record<string, any> {
    const isProduction = process.env.NODE_ENV === 'production';
    
    return {
      statusCode: this.getStatus(),
      message: this.message,
      error: HttpStatus[this.getStatus()],
      code: this.code,
      timestamp: this.timestamp,
      ...(this.correlationId && { correlationId: this.correlationId }),
      ...(!isProduction && this.operation && { operation: this.operation }),
      ...(!isProduction && this.parameters && { parameters: this.parameters }),
    };
  }
}