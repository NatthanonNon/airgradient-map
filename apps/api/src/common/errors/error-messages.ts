import { ErrorCode } from './error-codes.enum';

/**
 * Human-readable error messages mapped to error codes
 * These messages can be localized or customized for different environments
 */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  // ======================
  // MEASUREMENT ERRORS
  // ======================
  [ErrorCode.MEAS_001]: 'Failed to retrieve latest measurements',
  [ErrorCode.MEAS_002]: 'Failed to retrieve measurements by area',
  [ErrorCode.MEAS_003]: 'Failed to retrieve clustered measurements',
  [ErrorCode.MEAS_004]: 'Failed to create measurement',
  [ErrorCode.MEAS_005]: 'Failed to update measurement',
  [ErrorCode.MEAS_006]: 'Failed to delete measurement',
  
  [ErrorCode.MEAS_050]: 'Invalid measurement data provided',
  [ErrorCode.MEAS_051]: 'PM2.5 value must be between 0 and 1000 µg/m³',
  [ErrorCode.MEAS_052]: 'PM10 value must be between 0 and 2000 µg/m³',
  [ErrorCode.MEAS_053]: 'Temperature must be between -50°C and 80°C',
  [ErrorCode.MEAS_054]: 'Humidity must be between 0% and 100%',
  [ErrorCode.MEAS_055]: 'CO2 value must be between 200 and 10000 ppm',
  [ErrorCode.MEAS_056]: 'Invalid measurement timestamp',
  [ErrorCode.MEAS_057]: 'Measurement is too old (older than 30 days)',
  [ErrorCode.MEAS_058]: 'Measurement timestamp cannot be in the future',

  // ======================
  // LOCATION ERRORS
  // ======================
  [ErrorCode.LOC_001]: 'Failed to retrieve locations',
  [ErrorCode.LOC_002]: 'Failed to retrieve location by ID',
  [ErrorCode.LOC_003]: 'Failed to create location',
  [ErrorCode.LOC_004]: 'Failed to update location',
  [ErrorCode.LOC_005]: 'Failed to delete location',
  [ErrorCode.LOC_006]: 'Location not found',
  [ErrorCode.LOC_007]: 'Failed to retrieve location time series data',
  
  [ErrorCode.LOC_050]: 'Invalid location data provided',
  [ErrorCode.LOC_051]: 'Invalid coordinates provided',
  [ErrorCode.LOC_052]: 'Longitude must be between -180 and 180 degrees',
  [ErrorCode.LOC_053]: 'Latitude must be between -90 and 90 degrees',
  [ErrorCode.LOC_054]: 'Invalid sensor type. Must be "Small Sensor" or "Reference"',
  [ErrorCode.LOC_055]: 'Invalid timezone provided',
  [ErrorCode.LOC_056]: 'Location name must be less than 255 characters',
  [ErrorCode.LOC_057]: 'A location already exists at these coordinates',
  [ErrorCode.LOC_058]: 'Invalid area bounds. Check min/max coordinates',

  // ======================
  // DATABASE ERRORS
  // ======================
  [ErrorCode.DB_001]: 'Unable to connect to database',
  [ErrorCode.DB_002]: 'Database operation timed out',
  [ErrorCode.DB_003]: 'Database connection pool exhausted',
  [ErrorCode.DB_004]: 'Database service is currently unavailable',
  
  [ErrorCode.DB_020]: 'Database query execution failed',
  [ErrorCode.DB_021]: 'Database query timed out',
  [ErrorCode.DB_022]: 'Invalid query parameters provided',
  [ErrorCode.DB_023]: 'Database constraint violation',
  [ErrorCode.DB_024]: 'Referenced record does not exist',
  [ErrorCode.DB_025]: 'Duplicate record already exists',
  [ErrorCode.DB_026]: 'Data validation constraint violated',
  
  [ErrorCode.DB_050]: 'Database transaction failed',
  [ErrorCode.DB_051]: 'Database transaction timed out',
  [ErrorCode.DB_052]: 'Database deadlock detected',
  [ErrorCode.DB_053]: 'Failed to rollback transaction',
  
  [ErrorCode.DB_070]: 'Database migration failed',
  [ErrorCode.DB_071]: 'Database schema version mismatch',
  [ErrorCode.DB_072]: 'Database migration timed out',

  // ======================
  // AUTHENTICATION ERRORS
  // ======================
  [ErrorCode.AUTH_001]: 'Authentication failed',
  [ErrorCode.AUTH_002]: 'Invalid username or password',
  [ErrorCode.AUTH_003]: 'Access token has expired',
  [ErrorCode.AUTH_004]: 'Invalid access token provided',
  [ErrorCode.AUTH_005]: 'Malformed access token',
  [ErrorCode.AUTH_006]: 'Access denied',
  [ErrorCode.AUTH_007]: 'Insufficient permissions for this operation',
  
  [ErrorCode.AUTH_050]: 'Invalid API key provided',
  [ErrorCode.AUTH_051]: 'API key has expired',
  [ErrorCode.AUTH_052]: 'API key has been suspended',
  [ErrorCode.AUTH_053]: 'API key not found',
  [ErrorCode.AUTH_054]: 'API key rate limit exceeded',

  // ======================
  // VALIDATION ERRORS
  // ======================
  [ErrorCode.VAL_001]: 'Invalid input data provided',
  [ErrorCode.VAL_002]: 'Required field is missing',
  [ErrorCode.VAL_003]: 'Invalid data type provided',
  [ErrorCode.VAL_004]: 'Value is outside acceptable range',
  [ErrorCode.VAL_005]: 'Invalid format provided',
  [ErrorCode.VAL_006]: 'Invalid value for this field',
  
  [ErrorCode.VAL_020]: 'Page number must be greater than 0',
  [ErrorCode.VAL_021]: 'Page size must be between 1 and 1000',
  [ErrorCode.VAL_022]: 'Page size is too large',
  
  [ErrorCode.VAL_040]: 'Invalid geographic boundaries provided',
  [ErrorCode.VAL_041]: 'Geographic area is too large',
  [ErrorCode.VAL_042]: 'Zoom level must be between 0 and 22',
  [ErrorCode.VAL_043]: 'Invalid coordinate system',
  
  [ErrorCode.VAL_060]: 'Invalid date format provided',
  [ErrorCode.VAL_061]: 'Invalid time range specified',
  [ErrorCode.VAL_062]: 'Date cannot be in the future',
  [ErrorCode.VAL_063]: 'Date is too far in the past',

  // ======================
  // BUSINESS LOGIC ERRORS
  // ======================
  [ErrorCode.BIZ_001]: 'Data processing operation failed',
  [ErrorCode.BIZ_002]: 'Data is in an invalid state',
  [ErrorCode.BIZ_003]: 'Conflicting data detected',
  [ErrorCode.BIZ_004]: 'Data is not ready for processing',
  [ErrorCode.BIZ_005]: 'Data processing operation timed out',
  
  [ErrorCode.BIZ_050]: 'Air quality reading is invalid',
  [ErrorCode.BIZ_051]: 'Sensor malfunction detected',
  [ErrorCode.BIZ_052]: 'Data quality issues detected',
  [ErrorCode.BIZ_053]: 'Sensor requires calibration',
  [ErrorCode.BIZ_054]: 'Sensor is currently offline',

  // ======================
  // EXTERNAL SERVICE ERRORS
  // ======================
  [ErrorCode.EXT_001]: 'OpenAQ API service error',
  [ErrorCode.EXT_002]: 'OpenAQ API request timed out',
  [ErrorCode.EXT_003]: 'OpenAQ API rate limit exceeded',
  [ErrorCode.EXT_004]: 'OpenAQ API authentication failed',
  
  [ErrorCode.EXT_020]: 'External service is currently unavailable',
  [ErrorCode.EXT_021]: 'External service request timed out',
  [ErrorCode.EXT_022]: 'External service returned an error',

  // ======================
  // SYSTEM ERRORS
  // ======================
  [ErrorCode.SYS_001]: 'Internal server error occurred',
  [ErrorCode.SYS_002]: 'Service is temporarily unavailable',
  [ErrorCode.SYS_003]: 'System configuration error',
  [ErrorCode.SYS_004]: 'Requested resource not found',
  [ErrorCode.SYS_005]: 'HTTP method not allowed for this endpoint',
  [ErrorCode.SYS_006]: 'Request timed out',
  
  [ErrorCode.SYS_050]: 'Request payload is too large',
  [ErrorCode.SYS_051]: 'Rate limit exceeded',
  [ErrorCode.SYS_052]: 'Memory limit exceeded',
  [ErrorCode.SYS_053]: 'CPU limit exceeded',
  
  [ErrorCode.SYS_070]: 'System is under maintenance',
  [ErrorCode.SYS_071]: 'Feature is temporarily disabled',
  [ErrorCode.SYS_072]: 'API version mismatch',
};

/**
 * HTTP status code mappings for error codes
 */
export const ERROR_HTTP_STATUS: Record<ErrorCode, number> = {
  // Measurement errors - mostly 500 for data retrieval, 400 for validation
  [ErrorCode.MEAS_001]: 500,
  [ErrorCode.MEAS_002]: 500,
  [ErrorCode.MEAS_003]: 500,
  [ErrorCode.MEAS_004]: 500,
  [ErrorCode.MEAS_005]: 500,
  [ErrorCode.MEAS_006]: 500,
  [ErrorCode.MEAS_050]: 400,
  [ErrorCode.MEAS_051]: 400,
  [ErrorCode.MEAS_052]: 400,
  [ErrorCode.MEAS_053]: 400,
  [ErrorCode.MEAS_054]: 400,
  [ErrorCode.MEAS_055]: 400,
  [ErrorCode.MEAS_056]: 400,
  [ErrorCode.MEAS_057]: 400,
  [ErrorCode.MEAS_058]: 400,

  // Location errors
  [ErrorCode.LOC_001]: 500,
  [ErrorCode.LOC_002]: 500,
  [ErrorCode.LOC_003]: 500,
  [ErrorCode.LOC_004]: 500,
  [ErrorCode.LOC_005]: 500,
  [ErrorCode.LOC_006]: 404,
  [ErrorCode.LOC_007]: 500,
  [ErrorCode.LOC_050]: 400,
  [ErrorCode.LOC_051]: 400,
  [ErrorCode.LOC_052]: 400,
  [ErrorCode.LOC_053]: 400,
  [ErrorCode.LOC_054]: 400,
  [ErrorCode.LOC_055]: 400,
  [ErrorCode.LOC_056]: 400,
  [ErrorCode.LOC_057]: 409,
  [ErrorCode.LOC_058]: 400,

  // Database errors - mostly 500
  [ErrorCode.DB_001]: 503,
  [ErrorCode.DB_002]: 504,
  [ErrorCode.DB_003]: 503,
  [ErrorCode.DB_004]: 503,
  [ErrorCode.DB_020]: 500,
  [ErrorCode.DB_021]: 504,
  [ErrorCode.DB_022]: 400,
  [ErrorCode.DB_023]: 400,
  [ErrorCode.DB_024]: 400,
  [ErrorCode.DB_025]: 409,
  [ErrorCode.DB_026]: 400,
  [ErrorCode.DB_050]: 500,
  [ErrorCode.DB_051]: 504,
  [ErrorCode.DB_052]: 500,
  [ErrorCode.DB_053]: 500,
  [ErrorCode.DB_070]: 500,
  [ErrorCode.DB_071]: 500,
  [ErrorCode.DB_072]: 504,

  // Authentication errors
  [ErrorCode.AUTH_001]: 401,
  [ErrorCode.AUTH_002]: 401,
  [ErrorCode.AUTH_003]: 401,
  [ErrorCode.AUTH_004]: 401,
  [ErrorCode.AUTH_005]: 401,
  [ErrorCode.AUTH_006]: 403,
  [ErrorCode.AUTH_007]: 403,
  [ErrorCode.AUTH_050]: 401,
  [ErrorCode.AUTH_051]: 401,
  [ErrorCode.AUTH_052]: 403,
  [ErrorCode.AUTH_053]: 401,
  [ErrorCode.AUTH_054]: 429,

  // Validation errors - all 400
  [ErrorCode.VAL_001]: 400,
  [ErrorCode.VAL_002]: 400,
  [ErrorCode.VAL_003]: 400,
  [ErrorCode.VAL_004]: 400,
  [ErrorCode.VAL_005]: 400,
  [ErrorCode.VAL_006]: 400,
  [ErrorCode.VAL_020]: 400,
  [ErrorCode.VAL_021]: 400,
  [ErrorCode.VAL_022]: 400,
  [ErrorCode.VAL_040]: 400,
  [ErrorCode.VAL_041]: 400,
  [ErrorCode.VAL_042]: 400,
  [ErrorCode.VAL_043]: 400,
  [ErrorCode.VAL_060]: 400,
  [ErrorCode.VAL_061]: 400,
  [ErrorCode.VAL_062]: 400,
  [ErrorCode.VAL_063]: 400,

  // Business logic errors
  [ErrorCode.BIZ_001]: 500,
  [ErrorCode.BIZ_002]: 422,
  [ErrorCode.BIZ_003]: 409,
  [ErrorCode.BIZ_004]: 425,
  [ErrorCode.BIZ_005]: 504,
  [ErrorCode.BIZ_050]: 422,
  [ErrorCode.BIZ_051]: 422,
  [ErrorCode.BIZ_052]: 422,
  [ErrorCode.BIZ_053]: 422,
  [ErrorCode.BIZ_054]: 503,

  // External service errors
  [ErrorCode.EXT_001]: 502,
  [ErrorCode.EXT_002]: 504,
  [ErrorCode.EXT_003]: 429,
  [ErrorCode.EXT_004]: 502,
  [ErrorCode.EXT_020]: 503,
  [ErrorCode.EXT_021]: 504,
  [ErrorCode.EXT_022]: 502,

  // System errors
  [ErrorCode.SYS_001]: 500,
  [ErrorCode.SYS_002]: 503,
  [ErrorCode.SYS_003]: 500,
  [ErrorCode.SYS_004]: 404,
  [ErrorCode.SYS_005]: 405,
  [ErrorCode.SYS_006]: 504,
  [ErrorCode.SYS_050]: 413,
  [ErrorCode.SYS_051]: 429,
  [ErrorCode.SYS_052]: 507,
  [ErrorCode.SYS_053]: 507,
  [ErrorCode.SYS_070]: 503,
  [ErrorCode.SYS_071]: 501,
  [ErrorCode.SYS_072]: 426,
};