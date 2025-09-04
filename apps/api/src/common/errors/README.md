# 🚨 Centralized Error Management System

This directory contains the centralized error management system for the AirGradient Map API, providing consistent error handling, logging, and client responses across the entire application.

## 📁 Files Overview

```
errors/
├── error-codes.enum.ts       # Centralized error codes enum
├── error-messages.ts         # Human-readable messages & HTTP status codes
├── app-error.ts              # Custom error class with factory methods
├── index.ts                  # Barrel exports for easy imports
└── README.md                 # This documentation
```

## 🎯 Why Centralized Error Codes?

**Before:**
```typescript
// Scattered throughout codebase
throw new InternalServerErrorException({
  message: 'MEAS_001: Failed to retrieve latest measurements',
  code: 'MEAS_001',
});

// Different approaches in different files
throw new HttpException('Invalid coordinates', 400);
throw new Error('Database connection failed');
```

**After:**
```typescript
// Consistent, centralized approach
throw AppError.databaseError(ErrorCode.MEAS_001, 'retrieveLatest', error);
throw AppError.validationError(ErrorCode.LOC_051, 'coordinates', value);
```

## 📊 Error Code Structure

### Format: `[MODULE]_[ERROR_TYPE]_[SPECIFIC_ERROR]`

```typescript
export enum ErrorCode {
  // MEASUREMENT ERRORS (MEAS_001 - MEAS_099)
  MEAS_001 = 'MEAS_001', // Failed to retrieve latest measurements
  MEAS_050 = 'MEAS_050', // Invalid measurement data
  
  // LOCATION ERRORS (LOC_001 - LOC_099)  
  LOC_001 = 'LOC_001',   // Failed to retrieve locations
  LOC_050 = 'LOC_050',   // Invalid location data
  
  // DATABASE ERRORS (DB_001 - DB_099)
  DB_001 = 'DB_001',     // Connection failed
  DB_025 = 'DB_025',     // Unique constraint violation
  
  // ... and more
}
```

### Code Ranges:
- **001-049**: General/operational errors
- **050-099**: Validation/input errors

### Modules:
- **MEAS**: Measurement operations
- **LOC**: Location operations  
- **DB**: Database operations
- **AUTH**: Authentication/authorization
- **VAL**: Input validation
- **BIZ**: Business logic
- **EXT**: External services
- **SYS**: System/infrastructure

## 🚀 Usage Examples

### Basic Usage

```typescript
import { AppError, ErrorCode } from '@/common/errors';

// Throw a specific error
throw new AppError(ErrorCode.MEAS_001, {
  operation: 'retrieveLatest',
  parameters: { limit: 100 }
});
```

### Factory Methods (Recommended)

```typescript
// Database errors
throw AppError.databaseError(
  ErrorCode.DB_001, 
  'connectToDatabase', 
  originalError,
  { host: 'localhost', port: 5432 }
);

// Validation errors  
throw AppError.validationError(
  ErrorCode.VAL_052,
  'longitude', 
  -181
);

// Business logic errors
throw AppError.businessError(
  ErrorCode.BIZ_051,
  'processSensorData',
  { sensorId: 'AG-123' }
);
```

### In Repositories

```typescript
async retrieveLatest(limit: number): Promise<MeasurementEntity[]> {
  try {
    const result = await this.databaseService.runQuery(query, [limit]);
    return result.rows.map(row => new MeasurementEntity(row));
  } catch (error) {
    throw AppError.databaseError(
      ErrorCode.MEAS_001,
      'retrieveLatest', 
      error,
      { limit }
    );
  }
}
```

### In Controllers

```typescript
@Get('/current')
async getLatestMeasurements(@Query() query: GetMeasurementsDto) {
  // Validation errors are automatically handled by class-validator
  // and converted to AppError by the error interceptor
  
  try {
    return await this.measurementService.getLatest(query.limit);
  } catch (error) {
    // AppErrors are automatically handled by the error interceptor
    throw error; // Re-throw, interceptor will handle logging
  }
}
```

## 🏭 Factory Methods

### `AppError.databaseError()`
For database-related errors:
```typescript
AppError.databaseError(
  ErrorCode.DB_001,           // Error code
  'operationName',           // Operation context
  originalError,             // Original error object
  { param1: 'value' }        // Additional parameters
)
```

### `AppError.validationError()`
For input validation errors:
```typescript
AppError.validationError(
  ErrorCode.VAL_052,         // Error code
  'fieldName',               // Field that failed validation
  invalidValue               // The invalid value
)
```

### `AppError.businessError()`
For business logic errors:
```typescript
AppError.businessError(
  ErrorCode.BIZ_051,         // Error code
  'businessOperation',       // Business context
  { contextData: 'value' }   // Business context parameters
)
```

### `AppError.authenticationError()`
For auth-related errors:
```typescript
AppError.authenticationError(
  ErrorCode.AUTH_001,        // Error code
  'loginAttempt'            // Auth context
)
```

## 📋 Error Response Format

### Client Response
```json
{
  "statusCode": 400,
  "message": "PM2.5 value must be between 0 and 1000 µg/m³",
  "error": "Bad Request",
  "code": "MEAS_051", 
  "timestamp": "2024-01-01T12:00:00.000Z",
  "correlationId": "1704110400000-abc123def"
}
```

### Development Response (includes debug info)
```json
{
  "statusCode": 500,
  "message": "Failed to retrieve latest measurements",
  "error": "Internal Server Error", 
  "code": "MEAS_001",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "operation": "retrieveLatest",
  "parameters": { "limit": 100, "measure": "pm25" },
  "correlationId": "1704110400000-xyz789"
}
```

### Log Format
```json
{
  "code": "MEAS_001",
  "message": "Failed to retrieve latest measurements",
  "httpStatus": 500,
  "operation": "retrieveLatest",
  "parameters": { "limit": 100 },
  "timestamp": "2024-01-01T12:00:00.000Z",
  "correlationId": "1704110400000-xyz789",
  "originalError": {
    "message": "Connection timeout",
    "name": "DatabaseError",
    "stack": "..."
  },
  "request": {
    "method": "GET",
    "url": "/map/api/v1/measurements/current",
    "userAgent": "Mozilla/5.0...",
    "ip": "192.168.1.1"
  }
}
```

## 🔧 Error Interceptor Features

The `ErrorInterceptor` automatically:

1. **Converts Database Errors**: PostgreSQL errors → AppError instances
2. **Handles Validation Errors**: class-validator/Joi → AppError instances  
3. **Adds Correlation IDs**: For request tracing
4. **Sanitizes Logs**: Removes sensitive data (passwords, tokens)
5. **Contextual Logging**: Different log levels based on error type
6. **Structured Responses**: Consistent client response format

### Automatic Database Error Mapping

```typescript
// PostgreSQL error codes automatically mapped:
'23505' → ErrorCode.DB_025  // Unique constraint violation
'23503' → ErrorCode.DB_024  // Foreign key violation  
'08003' → ErrorCode.DB_001  // Connection failure
'57014' → ErrorCode.DB_021  // Query timeout
// ... and more
```

## 🧪 Testing Error Handling

```typescript
describe('Error Handling', () => {
  it('should handle database errors properly', async () => {
    const mockError = new Error('Connection failed');
    mockError.code = '08003'; // PostgreSQL connection error
    
    jest.spyOn(databaseService, 'runQuery').mockRejectedValue(mockError);
    
    try {
      await repository.retrieveLatest(10);
      fail('Expected error to be thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe(ErrorCode.DB_001);
      expect(error.operation).toBe('retrieveLatest');
    }
  });
  
  it('should handle validation errors', () => {
    const validationError = AppError.validationError(
      ErrorCode.VAL_052, 
      'longitude', 
      -181
    );
    
    expect(validationError.code).toBe(ErrorCode.VAL_052);
    expect(validationError.getStatus()).toBe(400);
    expect(validationError.isValidationError()).toBe(true);
  });
});
```

## 🔍 Error Analysis & Monitoring

### Check Error Types
```typescript
if (error.isValidationError()) {
  // Handle validation errors
} else if (error.isDatabaseError()) {
  // Handle database errors  
} else if (error.isAuthenticationError()) {
  // Handle auth errors
}
```

### Get Error Information
```typescript
const errorCode = getErrorCode(error);
const errorMessage = getErrorMessage(ErrorCode.MEAS_001);
const httpStatus = getErrorHttpStatus(ErrorCode.MEAS_001);
```

### Correlation ID Tracing
Each error gets a unique correlation ID for tracing across logs:
```
1704110400000-abc123def
└─────────────┘ └─────┘
    timestamp   random
```

## 📈 Adding New Error Codes

1. **Add to enum** (`error-codes.enum.ts`):
```typescript
export enum ErrorCode {
  // ... existing codes
  SENS_001 = 'SENS_001', // New sensor module error
}
```

2. **Add message** (`error-messages.ts`):
```typescript
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  // ... existing messages
  [ErrorCode.SENS_001]: 'Sensor initialization failed',
};

export const ERROR_HTTP_STATUS: Record<ErrorCode, number> = {
  // ... existing status codes
  [ErrorCode.SENS_001]: 500,
};
```

3. **Use in code**:
```typescript
throw AppError.systemError(ErrorCode.SENS_001, 'initializeSensor', error);
```

## 🚨 Best Practices

### ✅ Do:
- Use specific error codes for different scenarios
- Include relevant context in parameters
- Use factory methods for consistency
- Let the interceptor handle logging
- Test error scenarios

### ❌ Don't:
- Create generic catch-all errors
- Log errors manually in repositories (interceptor handles this)
- Expose sensitive data in error messages
- Use HTTP exceptions directly (use AppError instead)
- Ignore original error context

## 🔧 Configuration

### Environment-Specific Behavior
```typescript
// Production: Hide sensitive details
const isProduction = process.env.NODE_ENV === 'production';

// Error messages sanitized in production
const errorResponse = error.toClientFormat(); // Removes debug info in prod

// Stack traces only in development
if (!isProduction && originalError) {
  response.originalError = { stack: originalError.stack };
}
```

### Logging Levels
- **500+ errors**: `logger.error()` - Server errors
- **400-499 errors**: `logger.warn()` - Client errors  
- **< 400**: `logger.log()` - Informational

## 🎯 Benefits

1. **Consistency**: All errors follow the same format
2. **Traceability**: Correlation IDs for request tracking
3. **Maintainability**: Centralized error management
4. **Debugging**: Rich context and structured logging
5. **Client Experience**: Clear, actionable error messages
6. **Monitoring**: Easy to track error patterns and rates
7. **Production Safety**: Sensitive data automatically sanitized

---

**The centralized error system makes error handling consistent, traceable, and production-ready! 🎉**