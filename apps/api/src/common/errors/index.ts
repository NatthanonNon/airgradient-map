/**
 * Centralized Error Management System
 * 
 * This module provides a unified approach to error handling across the AirGradient Map API
 * 
 * Usage:
 * import { AppError, ErrorCode } from '@/common/errors';
 * 
 * throw AppError.databaseError(ErrorCode.DB_001, 'getLatestMeasurements', error);
 * throw AppError.validationError(ErrorCode.VAL_052, 'longitude', -181);
 * throw new AppError(ErrorCode.MEAS_001, { operation: 'retrieveLatest' });
 */

export { ErrorCode } from './error-codes.enum';
export { ERROR_MESSAGES, ERROR_HTTP_STATUS } from './error-messages';
export { AppError } from './app-error';

// Import for internal use
import { ErrorCode } from './error-codes.enum';
import { ERROR_MESSAGES, ERROR_HTTP_STATUS } from './error-messages';
import { AppError } from './app-error';

// Type definitions
export interface ErrorContext {
  operation?: string;
  parameters?: Record<string, any>;
  originalError?: Error;
  correlationId?: string;
  customMessage?: string;
  customHttpStatus?: number;
}

// Utility functions
export function isAppError(error: any): boolean {
  return error instanceof AppError;
}

export function getErrorCode(error: any): string | null {
  if (error instanceof AppError) {
    return error.code;
  }
  return null;
}

export function getErrorMessage(code: string): string {
  return ERROR_MESSAGES[code as ErrorCode] || 'Unknown error occurred';
}

export function getErrorHttpStatus(code: string): number {
  return ERROR_HTTP_STATUS[code as ErrorCode] || 500;
}