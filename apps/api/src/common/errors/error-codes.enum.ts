/**
 * Centralized Error Codes for AirGradient Map API
 * 
 * Format: [MODULE]_[ERROR_TYPE]_[SPECIFIC_ERROR]
 * - MODULE: MEAS (Measurement), LOC (Location), DB (Database), AUTH (Authentication), etc.
 * - ERROR_TYPE: 001-099 (General), 100-199 (Validation), 200-299 (Business Logic), etc.
 * - Keep codes sequential within each module
 */

export enum ErrorCode {
  // ======================
  // MEASUREMENT ERRORS (MEAS_001 - MEAS_099)
  // ======================
  
  // General measurement errors (001-049)
  MEAS_001 = 'MEAS_001', // Failed to retrieve latest measurements
  MEAS_002 = 'MEAS_002', // Failed to retrieve measurements by area
  MEAS_003 = 'MEAS_003', // Failed to retrieve clustered measurements
  MEAS_004 = 'MEAS_004', // Failed to create measurement
  MEAS_005 = 'MEAS_005', // Failed to update measurement
  MEAS_006 = 'MEAS_006', // Failed to delete measurement
  
  // Measurement validation errors (050-099)
  MEAS_050 = 'MEAS_050', // Invalid measurement data
  MEAS_051 = 'MEAS_051', // Invalid PM2.5 value
  MEAS_052 = 'MEAS_052', // Invalid PM10 value
  MEAS_053 = 'MEAS_053', // Invalid temperature value
  MEAS_054 = 'MEAS_054', // Invalid humidity value
  MEAS_055 = 'MEAS_055', // Invalid CO2 value
  MEAS_056 = 'MEAS_056', // Invalid measurement timestamp
  MEAS_057 = 'MEAS_057', // Measurement too old
  MEAS_058 = 'MEAS_058', // Measurement in future
  
  // ======================
  // LOCATION ERRORS (LOC_001 - LOC_099)
  // ======================
  
  // General location errors (001-049)
  LOC_001 = 'LOC_001', // Failed to retrieve locations
  LOC_002 = 'LOC_002', // Failed to retrieve location by ID
  LOC_003 = 'LOC_003', // Failed to create location
  LOC_004 = 'LOC_004', // Failed to update location
  LOC_005 = 'LOC_005', // Failed to delete location
  LOC_006 = 'LOC_006', // Location not found
  LOC_007 = 'LOC_007', // Failed to retrieve location timeseries
  
  // Location validation errors (050-099)
  LOC_050 = 'LOC_050', // Invalid location data
  LOC_051 = 'LOC_051', // Invalid coordinates
  LOC_052 = 'LOC_052', // Invalid longitude
  LOC_053 = 'LOC_053', // Invalid latitude
  LOC_054 = 'LOC_054', // Invalid sensor type
  LOC_055 = 'LOC_055', // Invalid timezone
  LOC_056 = 'LOC_056', // Location name too long
  LOC_057 = 'LOC_057', // Duplicate location
  LOC_058 = 'LOC_058', // Invalid area bounds
  
  // ======================
  // DATABASE ERRORS (DB_001 - DB_099)
  // ======================
  
  // Connection errors (001-019)
  DB_001 = 'DB_001', // Database connection failed
  DB_002 = 'DB_002', // Database timeout
  DB_003 = 'DB_003', // Connection pool exhausted
  DB_004 = 'DB_004', // Database unavailable
  
  // Query errors (020-049)
  DB_020 = 'DB_020', // Query execution failed
  DB_021 = 'DB_021', // Query timeout
  DB_022 = 'DB_022', // Invalid query parameters
  DB_023 = 'DB_023', // Constraint violation
  DB_024 = 'DB_024', // Foreign key violation
  DB_025 = 'DB_025', // Unique constraint violation
  DB_026 = 'DB_026', // Check constraint violation
  
  // Transaction errors (050-069)
  DB_050 = 'DB_050', // Transaction failed
  DB_051 = 'DB_051', // Transaction timeout
  DB_052 = 'DB_052', // Transaction deadlock
  DB_053 = 'DB_053', // Transaction rollback failed
  
  // Migration errors (070-099)
  DB_070 = 'DB_070', // Migration failed
  DB_071 = 'DB_071', // Schema version mismatch
  DB_072 = 'DB_072', // Migration timeout
  
  // ======================
  // AUTHENTICATION ERRORS (AUTH_001 - AUTH_099)
  // ======================
  
  // General auth errors (001-049)
  AUTH_001 = 'AUTH_001', // Authentication failed
  AUTH_002 = 'AUTH_002', // Invalid credentials
  AUTH_003 = 'AUTH_003', // Token expired
  AUTH_004 = 'AUTH_004', // Invalid token
  AUTH_005 = 'AUTH_005', // Token malformed
  AUTH_006 = 'AUTH_006', // Unauthorized access
  AUTH_007 = 'AUTH_007', // Insufficient permissions
  
  // API Key errors (050-069)
  AUTH_050 = 'AUTH_050', // Invalid API key
  AUTH_051 = 'AUTH_051', // API key expired
  AUTH_052 = 'AUTH_052', // API key suspended
  AUTH_053 = 'AUTH_053', // API key not found
  AUTH_054 = 'AUTH_054', // API key rate limit exceeded
  
  // ======================
  // VALIDATION ERRORS (VAL_001 - VAL_099)
  // ======================
  
  // Input validation (001-049)
  VAL_001 = 'VAL_001', // Invalid input data
  VAL_002 = 'VAL_002', // Missing required field
  VAL_003 = 'VAL_003', // Invalid data type
  VAL_004 = 'VAL_004', // Value out of range
  VAL_005 = 'VAL_005', // Invalid format
  VAL_006 = 'VAL_006', // Invalid enum value
  
  // Pagination validation (020-039)
  VAL_020 = 'VAL_020', // Invalid page number
  VAL_021 = 'VAL_021', // Invalid page size
  VAL_022 = 'VAL_022', // Page size too large
  
  // Geographic validation (040-059)
  VAL_040 = 'VAL_040', // Invalid geographic bounds
  VAL_041 = 'VAL_041', // Bounds too large
  VAL_042 = 'VAL_042', // Invalid zoom level
  VAL_043 = 'VAL_043', // Invalid coordinate system
  
  // Time validation (060-079)
  VAL_060 = 'VAL_060', // Invalid date format
  VAL_061 = 'VAL_061', // Invalid time range
  VAL_062 = 'VAL_062', // Date in future
  VAL_063 = 'VAL_063', // Date too old
  
  // ======================
  // BUSINESS LOGIC ERRORS (BIZ_001 - BIZ_099)
  // ======================
  
  // Data processing (001-049)
  BIZ_001 = 'BIZ_001', // Data processing failed
  BIZ_002 = 'BIZ_002', // Invalid data state
  BIZ_003 = 'BIZ_003', // Conflicting data
  BIZ_004 = 'BIZ_004', // Data not ready
  BIZ_005 = 'BIZ_005', // Processing timeout
  
  // Air quality specific (050-099)
  BIZ_050 = 'BIZ_050', // Invalid air quality reading
  BIZ_051 = 'BIZ_051', // Sensor malfunction detected
  BIZ_052 = 'BIZ_052', // Data quality issue
  BIZ_053 = 'BIZ_053', // Calibration required
  BIZ_054 = 'BIZ_054', // Sensor offline
  
  // ======================
  // EXTERNAL SERVICE ERRORS (EXT_001 - EXT_099)
  // ======================
  
  // OpenAQ integration (001-019)
  EXT_001 = 'EXT_001', // OpenAQ API error
  EXT_002 = 'EXT_002', // OpenAQ timeout
  EXT_003 = 'EXT_003', // OpenAQ rate limit
  EXT_004 = 'EXT_004', // OpenAQ authentication failed
  
  // Third-party services (020-099)
  EXT_020 = 'EXT_020', // External service unavailable
  EXT_021 = 'EXT_021', // External service timeout
  EXT_022 = 'EXT_022', // External service error
  
  // ======================
  // SYSTEM ERRORS (SYS_001 - SYS_099)
  // ======================
  
  // General system errors (001-049)
  SYS_001 = 'SYS_001', // Internal server error
  SYS_002 = 'SYS_002', // Service unavailable
  SYS_003 = 'SYS_003', // Configuration error
  SYS_004 = 'SYS_004', // Resource not found
  SYS_005 = 'SYS_005', // Method not allowed
  SYS_006 = 'SYS_006', // Request timeout
  
  // Performance errors (050-069)
  SYS_050 = 'SYS_050', // Request too large
  SYS_051 = 'SYS_051', // Rate limit exceeded
  SYS_052 = 'SYS_052', // Memory limit exceeded
  SYS_053 = 'SYS_053', // CPU limit exceeded
  
  // Maintenance errors (070-099)
  SYS_070 = 'SYS_070', // System maintenance
  SYS_071 = 'SYS_071', // Feature disabled
  SYS_072 = 'SYS_072', // Version mismatch
}