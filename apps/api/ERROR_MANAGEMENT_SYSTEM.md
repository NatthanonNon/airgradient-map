# 🚨 Centralized Error Management System

## ✅ **Error Code Centralization Complete!**

The AirGradient Map API now has a comprehensive, production-ready centralized error management system that provides consistent error handling, structured logging, and improved debugging capabilities.

## 🎯 **Problem Solved**

### **Before (Scattered Error Handling):**
```typescript
❌ throw new InternalServerErrorException({
     message: 'MEAS_001: Failed to retrieve latest measurements',
     code: 'MEAS_001',
   });

❌ throw new HttpException('Invalid coordinates', 400);

❌ throw new Error('Database connection failed');
```

### **After (Centralized System):**
```typescript
✅ throw AppError.databaseError(ErrorCode.MEAS_001, 'retrieveLatest', error);

✅ throw AppError.validationError(ErrorCode.LOC_052, 'longitude', -181);

✅ throw AppError.businessError(ErrorCode.BIZ_051, 'processSensorData');
```

## 📁 **System Architecture**

```
src/common/errors/
├── error-codes.enum.ts      # 📋 Centralized error codes (80+ codes)
├── error-messages.ts        # 💬 Human-readable messages & HTTP status
├── app-error.ts            # 🏗️  Custom error class with factory methods
├── index.ts                # 📦 Barrel exports for easy imports
└── README.md               # 📖 Comprehensive documentation
```

## 🔢 **Error Code System**

### **Hierarchical Organization**
```typescript
export enum ErrorCode {
  // MEASUREMENT ERRORS (MEAS_001 - MEAS_099)
  MEAS_001 = 'MEAS_001',   // Failed to retrieve latest measurements
  MEAS_051 = 'MEAS_051',   // Invalid PM2.5 value
  
  // LOCATION ERRORS (LOC_001 - LOC_099)
  LOC_001 = 'LOC_001',     // Failed to retrieve locations  
  LOC_052 = 'LOC_052',     // Invalid longitude
  
  // DATABASE ERRORS (DB_001 - DB_099)
  DB_001 = 'DB_001',       // Connection failed
  DB_025 = 'DB_025',       // Unique constraint violation
  
  // ... 6 more modules with 80+ total codes
}
```

### **Module Coverage**
- **MEAS**: Measurement operations (18 codes)
- **LOC**: Location operations (16 codes)
- **DB**: Database operations (16 codes)
- **AUTH**: Authentication (12 codes)
- **VAL**: Input validation (16 codes)
- **BIZ**: Business logic (10 codes)
- **EXT**: External services (8 codes)
- **SYS**: System errors (12 codes)

## 🏭 **Factory Methods**

### **Type-Safe Error Creation**
```typescript
// Database errors with context
AppError.databaseError(
  ErrorCode.MEAS_001,        // Specific error code
  'retrieveLatest',          // Operation context
  originalError,             // Original error for debugging
  { limit: 100, measure: 'pm25' } // Additional parameters
);

// Validation errors with field context  
AppError.validationError(
  ErrorCode.VAL_052,         // Longitude validation error
  'longitude',               // Field name
  -181                       // Invalid value
);

// Business logic errors
AppError.businessError(
  ErrorCode.BIZ_051,         // Sensor malfunction
  'processSensorData',       // Business operation
  { sensorId: 'AG-123' }     // Business context
);
```

## 📊 **Structured Error Responses**

### **Client Response (Production-Safe)**
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

### **Development Response (With Debug Info)**
```json
{
  "statusCode": 500,
  "message": "Failed to retrieve latest measurements", 
  "error": "Internal Server Error",
  "code": "MEAS_001",
  "operation": "retrieveLatest",
  "parameters": { "limit": 100, "measure": "pm25" },
  "correlationId": "1704110400000-xyz789",
  "originalError": { "message": "...", "stack": "..." }
}
```

## 🔄 **Enhanced Error Interceptor**

### **Automatic Error Processing**
```typescript
@Injectable()
export class ErrorInterceptor {
  intercept(context, next) {
    return next.handle().pipe(
      catchError(error => {
        // ✅ Handle AppError instances
        // ✅ Convert PostgreSQL errors automatically
        // ✅ Add correlation IDs for tracing
        // ✅ Sanitize sensitive data
        // ✅ Structure logs consistently
        // ✅ Map HTTP status codes properly
      })
    );
  }
}
```

### **Automatic Database Error Mapping**
```typescript
PostgreSQL Error Codes → AppError Codes:
'23505' (unique violation)     → ErrorCode.DB_025
'23503' (foreign key)          → ErrorCode.DB_024  
'08003' (connection failure)   → ErrorCode.DB_001
'57014' (query timeout)        → ErrorCode.DB_021
'40P01' (deadlock)            → ErrorCode.DB_052
```

## 🔍 **Request Tracing**

### **Correlation ID System**
Each error gets a unique correlation ID for tracing:
```
Format: {timestamp}-{randomId}
Example: 1704110400000-abc123def
```

**Benefits:**
- Track requests across microservices
- Correlate logs from different components
- Debug complex request flows
- Monitor error patterns

## 📈 **Structured Logging**

### **Log Levels by Error Type**
```typescript
// Server errors (500+): logger.error()
{
  "level": "error",
  "code": "MEAS_001",
  "message": "Failed to retrieve latest measurements",
  "operation": "retrieveLatest",
  "correlationId": "...",
  "request": { "method": "GET", "url": "/measurements" },
  "originalError": { "stack": "..." }
}

// Client errors (400-499): logger.warn()
{
  "level": "warn", 
  "code": "VAL_052",
  "message": "Invalid longitude value",
  "parameters": { "field": "longitude", "value": -181 }
}
```

## 🛡️ **Security Features**

### **Sensitive Data Sanitization**
```typescript
// Automatically removes from logs:
const sensitiveFields = [
  'password', 'token', 'apiKey', 'secret', 'authorization'
];

// Before: { password: 'secret123' }
// After:  { password: '[REDACTED]' }
```

### **Environment-Based Information**
- **Production**: Hide debug information, stack traces
- **Development**: Show full error context, parameters
- **Test**: Consistent error format for assertions

## 🧪 **Testing Support**

### **Type-Safe Error Testing**
```typescript
describe('Error Handling', () => {
  it('should throw proper error codes', async () => {
    try {
      await repository.retrieveLatest(10);
      fail('Expected error');
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe(ErrorCode.MEAS_001);
      expect(error.operation).toBe('retrieveLatest');
      expect(error.isValidationError()).toBe(false);
      expect(error.isDatabaseError()).toBe(true);
    }
  });
});
```

### **Error Utility Functions**
```typescript
// Check error types
isAppError(error)           // boolean
error.isDatabaseError()     // boolean  
error.isValidationError()   // boolean
error.isAuthenticationError() // boolean

// Get error information
getErrorCode(error)         // string | null
getErrorMessage(code)       // string
getErrorHttpStatus(code)    // number
```

## 🔧 **Implementation Examples**

### **Repository Layer**
```typescript
// Before
catch (error) {
  throw new InternalServerErrorException({
    message: 'MEAS_001: Failed to retrieve latest measurements',
    code: 'MEAS_001'
  });
}

// After  
catch (error) {
  throw AppError.databaseError(
    ErrorCode.MEAS_001,
    'retrieveLatest',
    error,
    { offset, limit, measure }
  );
}
```

### **Service Layer**
```typescript
// Validation
if (longitude < -180 || longitude > 180) {
  throw AppError.validationError(
    ErrorCode.VAL_052,
    'longitude', 
    longitude
  );
}

// Business logic
if (sensor.needsCalibration()) {
  throw AppError.businessError(
    ErrorCode.BIZ_053,
    'processSensorReading',
    { sensorId: sensor.id, lastCalibration: sensor.lastCalibrated }
  );
}
```

## 📊 **Benefits Achieved**

### **Developer Experience**
- ✅ **Consistent API**: Same error handling pattern everywhere
- ✅ **Type Safety**: Enum-based error codes prevent typos
- ✅ **Easy Debugging**: Rich context and correlation IDs
- ✅ **Factory Methods**: Guided error creation

### **Production Operations** 
- ✅ **Structured Logging**: Easy to parse and monitor
- ✅ **Error Tracking**: Correlation IDs for request tracing
- ✅ **Security**: Automatic sensitive data sanitization
- ✅ **Monitoring**: Consistent error codes for alerting

### **API Consumers**
- ✅ **Clear Messages**: Human-readable error descriptions
- ✅ **Actionable Codes**: Specific codes for programmatic handling
- ✅ **Consistent Format**: Same response structure always
- ✅ **Proper HTTP Status**: Correct status codes automatically

## 🎯 **Usage in Production**

### **Monitoring & Alerting**
```bash
# Alert on database connection errors
code:DB_001 AND level:error

# Monitor validation error trends
code:VAL_* AND level:warn

# Track sensor malfunction alerts
code:BIZ_051 AND operation:processSensorData
```

### **Log Analysis**
```bash
# Find all errors for a specific request
correlationId:"1704110400000-abc123def"

# Track errors by operation
operation:"retrieveLatest" AND level:error

# Monitor external service failures
code:EXT_* AND level:error
```

## 🚀 **Migration Complete**

The error management system provides:

1. **🎯 80+ Specific Error Codes** - Covering all major scenarios
2. **🏭 Factory Methods** - Type-safe error creation 
3. **🔄 Automatic Conversion** - Database/validation errors handled
4. **📊 Structured Logging** - Rich context with correlation IDs
5. **🛡️ Security** - Automatic sensitive data sanitization
6. **🧪 Testing Support** - Easy error assertion utilities
7. **📖 Documentation** - Comprehensive usage examples

**The API now has enterprise-grade error handling that's consistent, traceable, and production-ready! 🎉**

## 🔮 **Future Enhancements**

- **Localization**: Multi-language error messages
- **Metrics Integration**: Error rate monitoring
- **Error Recovery**: Automatic retry strategies  
- **Circuit Breaker**: Fail-fast for external services
- **Error Budgets**: SLI/SLO error rate tracking