import { Logger } from '@nestjs/common';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { DataSourceConfig, DataSourcePlugin, MeasurementData } from '../interfaces/datasource-plugin.interface';
import { AppError, ErrorCode } from '../../common/errors';

export abstract class BaseDataSourcePlugin implements DataSourcePlugin {
  protected readonly logger: Logger;
  protected readonly httpClient: AxiosInstance;
  
  constructor(public readonly config: DataSourceConfig) {
    this.logger = new Logger(`${this.constructor.name}:${config.name}`);
    this.httpClient = this.createHttpClient();
  }

  abstract get name(): string;
  abstract getMetadata(): {
    description: string;
    version: string;
    supportedMeasurements: string[];
    expectedUpdateFrequency: string;
  };

  private createHttpClient(): AxiosInstance {
    const client = axios.create({
      baseURL: this.config.apiConfig.baseUrl,
      timeout: this.config.apiConfig.timeout || 30000,
      headers: {
        'User-Agent': 'AirGradient-Map-API/1.0',
        ...this.config.apiConfig.headers,
      },
    });

    // Add API key to headers if provided
    if (this.config.apiConfig.apiKey) {
      client.defaults.headers.common['Authorization'] = `Bearer ${this.config.apiConfig.apiKey}`;
      // Some APIs use different header names
      client.defaults.headers.common['X-API-Key'] = this.config.apiConfig.apiKey;
    }

    // Request interceptor for logging
    client.interceptors.request.use(
      (config) => {
        this.logger.debug(`Making request to ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        this.logger.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging and error handling
    client.interceptors.response.use(
      (response) => {
        this.logger.debug(`Response received: ${response.status} ${response.statusText}`);
        return response;
      },
      (error) => {
        this.logger.error(`HTTP Error: ${error.response?.status} ${error.response?.statusText}`, error.message);
        return Promise.reject(error);
      }
    );

    return client;
  }

  async validateConfig(): Promise<boolean> {
    try {
      // Basic configuration validation
      if (!this.config.name || !this.config.apiConfig.baseUrl) {
        this.logger.error('Missing required configuration: name or baseUrl');
        return false;
      }

      // Validate cron expression
      if (!this.isValidCronExpression(this.config.cronSchedule)) {
        this.logger.error(`Invalid cron expression: ${this.config.cronSchedule}`);
        return false;
      }

      // Validate mapping configuration
      if (!this.config.mapping.longitude || !this.config.mapping.latitude) {
        this.logger.error('Missing required coordinate mapping');
        return false;
      }

      // Test API connectivity
      const isHealthy = await this.healthCheck();
      if (!isHealthy) {
        this.logger.warn('API health check failed during validation');
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error('Configuration validation failed:', error.message);
      return false;
    }
  }

  private isValidCronExpression(cron: string): boolean {
    // Basic cron validation - should have 6 parts for seconds precision
    const parts = cron.trim().split(/\s+/);
    return parts.length === 6;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.httpClient.get('/health', { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      try {
        // Fallback: try to fetch a small amount of data
        const testData = await this.fetchData();
        return Array.isArray(testData);
      } catch (fallbackError) {
        this.logger.warn(`Health check failed: ${error.message}`);
        return false;
      }
    }
  }

  async fetchData(): Promise<any[]> {
    const maxRetries = this.config.apiConfig.retries || 3;
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.debug(`Fetching data (attempt ${attempt}/${maxRetries})`);
        
        const response = await this.httpClient.get(this.getDataEndpoint());
        
        if (!response.data) {
          throw new Error('No data received from API');
        }

        const data = this.extractDataFromResponse(response.data);
        
        this.logger.log(`Successfully fetched ${data.length} records`);
        return data;
        
      } catch (error) {
        lastError = error;
        this.logger.warn(`Attempt ${attempt} failed: ${error.message}`);
        
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          await this.delay(delay);
        }
      }
    }

    throw AppError.externalServiceError(
      ErrorCode.EXT_001,
      'fetchData',
      lastError,
      { dataSource: this.name, attempts: maxRetries }
    );
  }

  protected abstract getDataEndpoint(): string;

  protected extractDataFromResponse(response: any): any[] {
    // Default implementation - override in specific plugins
    if (Array.isArray(response)) {
      return response;
    }
    
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    }
    
    if (response.results && Array.isArray(response.results)) {
      return response.results;
    }
    
    throw new Error('Unable to extract data array from response');
  }

  async transformData(rawData: any[]): Promise<MeasurementData[]> {
    const transformedData: MeasurementData[] = [];

    for (const item of rawData) {
      try {
        const measurement = await this.transformSingleItem(item);
        if (measurement) {
          transformedData.push(measurement);
        }
      } catch (error) {
        this.logger.warn(`Failed to transform item: ${error.message}`, item);
        // Continue processing other items
      }
    }

    this.logger.log(`Transformed ${transformedData.length}/${rawData.length} records`);
    return transformedData;
  }

  protected async transformSingleItem(item: any): Promise<MeasurementData | null> {
    try {
      // Apply filters if configured
      if (this.config.transformation?.filters) {
        if (!this.passesFilters(item, this.config.transformation.filters)) {
          return null;
        }
      }

      const measurement: MeasurementData = {
        locationId: this.getValue(item, this.config.mapping.locationId),
        locationName: this.getValue(item, this.config.mapping.locationName),
        longitude: this.getNumericValue(item, this.config.mapping.longitude),
        latitude: this.getNumericValue(item, this.config.mapping.latitude),
        sensorType: this.getValue(item, this.config.mapping.sensorType),
        pm25: this.getOptionalNumericValue(item, this.config.mapping.pm25),
        pm10: this.getOptionalNumericValue(item, this.config.mapping.pm10),
        atmp: this.getOptionalNumericValue(item, this.config.mapping.atmp),
        rhum: this.getOptionalNumericValue(item, this.config.mapping.rhum),
        rco2: this.getOptionalNumericValue(item, this.config.mapping.rco2),
        o3: this.getOptionalNumericValue(item, this.config.mapping.o3),
        no2: this.getOptionalNumericValue(item, this.config.mapping.no2),
        measuredAt: this.getDateValue(item, this.config.mapping.measuredAt),
        dataSource: this.name,
      };

      // Apply coordinate transformation if needed
      if (this.config.transformation?.coordinates === 'transform') {
        const transformed = await this.transformCoordinates(measurement.longitude, measurement.latitude);
        measurement.longitude = transformed.longitude;
        measurement.latitude = transformed.latitude;
      }

      // Apply value multipliers if configured
      if (this.config.transformation?.valueMultipliers) {
        this.applyValueMultipliers(measurement, this.config.transformation.valueMultipliers);
      }

      return measurement;
    } catch (error) {
      this.logger.error(`Error transforming item: ${error.message}`, item);
      return null;
    }
  }

  protected getValue(item: any, path: string): string {
    const value = this.getNestedValue(item, path);
    return String(value || '');
  }

  protected getNumericValue(item: any, path: string): number {
    const value = this.getNestedValue(item, path);
    const numeric = parseFloat(value);
    if (isNaN(numeric)) {
      throw new Error(`Invalid numeric value for ${path}: ${value}`);
    }
    return numeric;
  }

  protected getOptionalNumericValue(item: any, path?: string): number | undefined {
    if (!path) return undefined;
    
    const value = this.getNestedValue(item, path);
    if (value === null || value === undefined || value === '') return undefined;
    
    const numeric = parseFloat(value);
    return isNaN(numeric) ? undefined : numeric;
  }

  protected getDateValue(item: any, path: string): Date {
    const value = this.getNestedValue(item, path);
    
    let date: Date;
    
    if (this.config.transformation?.dateFormat) {
      // Custom date parsing logic could be implemented here
      date = new Date(value);
    } else {
      date = new Date(value);
    }
    
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date value for ${path}: ${value}`);
    }
    
    return date;
  }

  protected getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  }

  protected passesFilters(item: any, filters: Record<string, any>): boolean {
    for (const [key, expectedValue] of Object.entries(filters)) {
      const actualValue = this.getNestedValue(item, key);
      if (actualValue !== expectedValue) {
        return false;
      }
    }
    return true;
  }

  protected async transformCoordinates(longitude: number, latitude: number): Promise<{ longitude: number; latitude: number }> {
    // Default implementation - override for specific coordinate transformations
    return { longitude, latitude };
  }

  protected applyValueMultipliers(measurement: MeasurementData, multipliers: Record<string, number>): void {
    for (const [field, multiplier] of Object.entries(multipliers)) {
      if (measurement[field as keyof MeasurementData] && typeof measurement[field as keyof MeasurementData] === 'number') {
        (measurement as any)[field] *= multiplier;
      }
    }
  }

  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}