import { Injectable } from '@nestjs/common';
import { DataSourceConfig } from '../interfaces/datasource-plugin.interface';
import { AppError, ErrorCode } from '../../common/errors';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

@Injectable()
export class DataSourceValidator {
  
  async validateConfig(config: DataSourceConfig): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
    };

    // Validate basic structure
    this.validateBasicStructure(config, result);
    
    // Validate name
    this.validateName(config.name, result);
    
    // Validate cron schedule
    this.validateCronSchedule(config.cronSchedule, result);
    
    // Validate API configuration
    this.validateApiConfig(config.apiConfig, result);
    
    // Validate mapping configuration
    this.validateMapping(config.mapping, result);
    
    // Validate transformation configuration
    if (config.transformation) {
      this.validateTransformation(config.transformation, result);
    }

    result.valid = result.errors.length === 0;
    return result;
  }

  private validateBasicStructure(config: DataSourceConfig, result: ValidationResult): void {
    if (!config) {
      result.errors.push({
        field: 'config',
        message: 'Configuration object is required',
        code: 'REQUIRED',
      });
      return;
    }

    const requiredFields = ['name', 'enabled', 'cronSchedule', 'apiConfig', 'mapping'];
    for (const field of requiredFields) {
      if (!(field in config) || config[field as keyof DataSourceConfig] === undefined) {
        result.errors.push({
          field,
          message: `${field} is required`,
          code: 'REQUIRED',
        });
      }
    }
  }

  private validateName(name: string, result: ValidationResult): void {
    if (!name || typeof name !== 'string') {
      result.errors.push({
        field: 'name',
        message: 'Name must be a non-empty string',
        code: 'INVALID_TYPE',
      });
      return;
    }

    // Check name format
    const nameRegex = /^[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?$/;
    if (!nameRegex.test(name)) {
      result.errors.push({
        field: 'name',
        message: 'Name must be lowercase, alphanumeric, and may contain hyphens (2-63 characters)',
        code: 'INVALID_FORMAT',
      });
    }

    // Check reserved names
    const reservedNames = ['admin', 'api', 'system', 'health', 'status', 'config'];
    if (reservedNames.includes(name)) {
      result.errors.push({
        field: 'name',
        message: `'${name}' is a reserved name`,
        code: 'RESERVED_NAME',
      });
    }
  }

  private validateCronSchedule(cronSchedule: string, result: ValidationResult): void {
    if (!cronSchedule || typeof cronSchedule !== 'string') {
      result.errors.push({
        field: 'cronSchedule',
        message: 'Cron schedule must be a non-empty string',
        code: 'INVALID_TYPE',
      });
      return;
    }

    // Validate cron expression format (6 parts for seconds precision)
    const cronParts = cronSchedule.trim().split(/\s+/);
    if (cronParts.length !== 6) {
      result.errors.push({
        field: 'cronSchedule',
        message: 'Cron schedule must have 6 parts (second, minute, hour, day, month, weekday)',
        code: 'INVALID_FORMAT',
      });
      return;
    }

    // Validate each part
    const cronValidation = [
      { part: cronParts[0], name: 'second', min: 0, max: 59 },
      { part: cronParts[1], name: 'minute', min: 0, max: 59 },
      { part: cronParts[2], name: 'hour', min: 0, max: 23 },
      { part: cronParts[3], name: 'day', min: 1, max: 31 },
      { part: cronParts[4], name: 'month', min: 1, max: 12 },
      { part: cronParts[5], name: 'weekday', min: 0, max: 7 },
    ];

    for (const validation of cronValidation) {
      if (!this.isValidCronPart(validation.part, validation.min, validation.max)) {
        result.errors.push({
          field: 'cronSchedule',
          message: `Invalid ${validation.name} part: ${validation.part}`,
          code: 'INVALID_CRON_PART',
        });
      }
    }

    // Warning for very frequent schedules (less than 1 minute)
    if (this.getScheduleFrequencySeconds(cronSchedule) < 60) {
      result.warnings.push({
        field: 'cronSchedule',
        message: 'Schedule runs more frequently than once per minute',
        suggestion: 'Consider if such frequent updates are necessary for data quality',
      });
    }
  }

  private validateApiConfig(apiConfig: any, result: ValidationResult): void {
    if (!apiConfig || typeof apiConfig !== 'object') {
      result.errors.push({
        field: 'apiConfig',
        message: 'API configuration must be an object',
        code: 'INVALID_TYPE',
      });
      return;
    }

    // Validate baseUrl
    if (!apiConfig.baseUrl || typeof apiConfig.baseUrl !== 'string') {
      result.errors.push({
        field: 'apiConfig.baseUrl',
        message: 'Base URL is required and must be a string',
        code: 'REQUIRED',
      });
    } else {
      try {
        new URL(apiConfig.baseUrl);
      } catch {
        result.errors.push({
          field: 'apiConfig.baseUrl',
          message: 'Base URL must be a valid URL',
          code: 'INVALID_URL',
        });
      }
    }

    // Validate timeout
    if (apiConfig.timeout !== undefined) {
      if (typeof apiConfig.timeout !== 'number' || apiConfig.timeout <= 0) {
        result.errors.push({
          field: 'apiConfig.timeout',
          message: 'Timeout must be a positive number (milliseconds)',
          code: 'INVALID_VALUE',
        });
      } else if (apiConfig.timeout > 300000) {
        result.warnings.push({
          field: 'apiConfig.timeout',
          message: 'Timeout is greater than 5 minutes',
          suggestion: 'Consider reducing timeout to avoid blocking other operations',
        });
      }
    }

    // Validate retries
    if (apiConfig.retries !== undefined) {
      if (typeof apiConfig.retries !== 'number' || apiConfig.retries < 0 || apiConfig.retries > 10) {
        result.errors.push({
          field: 'apiConfig.retries',
          message: 'Retries must be a number between 0 and 10',
          code: 'INVALID_RANGE',
        });
      }
    }

    // Validate headers
    if (apiConfig.headers !== undefined) {
      if (typeof apiConfig.headers !== 'object' || Array.isArray(apiConfig.headers)) {
        result.errors.push({
          field: 'apiConfig.headers',
          message: 'Headers must be an object with string values',
          code: 'INVALID_TYPE',
        });
      } else {
        for (const [key, value] of Object.entries(apiConfig.headers)) {
          if (typeof value !== 'string') {
            result.errors.push({
              field: `apiConfig.headers.${key}`,
              message: 'Header values must be strings',
              code: 'INVALID_TYPE',
            });
          }
        }
      }
    }
  }

  private validateMapping(mapping: any, result: ValidationResult): void {
    if (!mapping || typeof mapping !== 'object') {
      result.errors.push({
        field: 'mapping',
        message: 'Mapping configuration must be an object',
        code: 'INVALID_TYPE',
      });
      return;
    }

    // Required mapping fields
    const requiredFields = ['locationId', 'locationName', 'longitude', 'latitude', 'sensorType', 'measuredAt'];
    for (const field of requiredFields) {
      if (!mapping[field] || typeof mapping[field] !== 'string') {
        result.errors.push({
          field: `mapping.${field}`,
          message: `${field} mapping is required and must be a string`,
          code: 'REQUIRED',
        });
      }
    }

    // Optional measurement fields
    const optionalFields = ['pm25', 'pm10', 'atmp', 'rhum', 'rco2', 'o3', 'no2'];
    let hasAnyMeasurement = false;
    
    for (const field of optionalFields) {
      if (mapping[field]) {
        if (typeof mapping[field] !== 'string') {
          result.errors.push({
            field: `mapping.${field}`,
            message: `${field} mapping must be a string`,
            code: 'INVALID_TYPE',
          });
        } else {
          hasAnyMeasurement = true;
        }
      }
    }

    if (!hasAnyMeasurement) {
      result.warnings.push({
        field: 'mapping',
        message: 'No measurement fields mapped',
        suggestion: 'Consider mapping at least one measurement field (pm25, pm10, etc.)',
      });
    }
  }

  private validateTransformation(transformation: any, result: ValidationResult): void {
    if (typeof transformation !== 'object') {
      result.errors.push({
        field: 'transformation',
        message: 'Transformation configuration must be an object',
        code: 'INVALID_TYPE',
      });
      return;
    }

    // Validate coordinates transformation
    if (transformation.coordinates !== undefined) {
      const validCoordinates = ['transform', 'direct'];
      if (!validCoordinates.includes(transformation.coordinates)) {
        result.errors.push({
          field: 'transformation.coordinates',
          message: `Coordinates must be one of: ${validCoordinates.join(', ')}`,
          code: 'INVALID_ENUM',
        });
      }
    }

    // Validate value multipliers
    if (transformation.valueMultipliers !== undefined) {
      if (typeof transformation.valueMultipliers !== 'object') {
        result.errors.push({
          field: 'transformation.valueMultipliers',
          message: 'Value multipliers must be an object',
          code: 'INVALID_TYPE',
        });
      } else {
        for (const [field, value] of Object.entries(transformation.valueMultipliers)) {
          if (typeof value !== 'number') {
            result.errors.push({
              field: `transformation.valueMultipliers.${field}`,
              message: 'Multiplier values must be numbers',
              code: 'INVALID_TYPE',
            });
          }
        }
      }
    }

    // Validate filters
    if (transformation.filters !== undefined) {
      if (typeof transformation.filters !== 'object' || Array.isArray(transformation.filters)) {
        result.errors.push({
          field: 'transformation.filters',
          message: 'Filters must be an object',
          code: 'INVALID_TYPE',
        });
      }
    }
  }

  private isValidCronPart(part: string, min: number, max: number): boolean {
    // Handle wildcard
    if (part === '*') return true;
    
    // Handle step values (*/5)
    if (part.includes('/')) {
      const [range, step] = part.split('/');
      if (range === '*') return true;
      return this.isValidCronPart(range, min, max) && !isNaN(parseInt(step));
    }
    
    // Handle ranges (1-5)
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(Number);
      return !isNaN(start) && !isNaN(end) && start >= min && end <= max && start <= end;
    }
    
    // Handle lists (1,3,5)
    if (part.includes(',')) {
      return part.split(',').every(p => this.isValidCronPart(p, min, max));
    }
    
    // Handle single number
    const num = parseInt(part);
    return !isNaN(num) && num >= min && num <= max;
  }

  private getScheduleFrequencySeconds(cronSchedule: string): number {
    // Simple frequency estimation - would need more complex logic for accurate calculation
    const parts = cronSchedule.split(' ');
    const secondPart = parts[0];
    const minutePart = parts[1];
    
    if (secondPart !== '*' && minutePart === '*') {
      // Runs every minute at specific second
      return 60;
    }
    
    if (secondPart === '*' && minutePart !== '*') {
      // Runs every hour at specific minute
      return 3600;
    }
    
    if (secondPart.includes('/')) {
      const step = parseInt(secondPart.split('/')[1]);
      return step || 1;
    }
    
    // Default to every minute for conservative warning
    return 60;
  }

  validateMultipleConfigs(configs: DataSourceConfig[]): Promise<ValidationResult[]> {
    return Promise.all(configs.map(config => this.validateConfig(config)));
  }

  async validateUniqueNames(configs: DataSourceConfig[]): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
    };

    const names = new Set<string>();
    const duplicates = new Set<string>();

    for (const config of configs) {
      if (names.has(config.name)) {
        duplicates.add(config.name);
      } else {
        names.add(config.name);
      }
    }

    for (const duplicate of duplicates) {
      result.errors.push({
        field: 'name',
        message: `Duplicate data source name: ${duplicate}`,
        code: 'DUPLICATE_NAME',
      });
    }

    result.valid = result.errors.length === 0;
    return result;
  }
}