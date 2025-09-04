export interface MeasurementData {
  locationId: string;
  locationName: string;
  longitude: number;
  latitude: number;
  sensorType: string;
  pm25?: number;
  pm10?: number;
  atmp?: number;
  rhum?: number;
  rco2?: number;
  o3?: number;
  no2?: number;
  measuredAt: Date;
  dataSource: string;
}

export interface DataSourceConfig {
  name: string;
  enabled: boolean;
  cronSchedule: string; // e.g., '0 */5 * * * *' (every 5 minutes)
  apiConfig: {
    baseUrl: string;
    apiKey?: string;
    endpoint?: string;
    healthEndpoint?: string;
    headers?: Record<string, string>;
    timeout?: number;
    retries?: number;
  };
  mapping: {
    locationId: string;
    locationName: string;
    longitude: string;
    latitude: string;
    sensorType: string;
    pm25?: string;
    pm10?: string;
    atmp?: string;
    rhum?: string;
    rco2?: string;
    o3?: string;
    no2?: string;
    measuredAt: string;
  };
  transformation?: {
    coordinates?: 'transform' | 'direct'; // Transform coordinate system if needed
    dateFormat?: string; // Custom date parsing format
    valueMultipliers?: Record<string, number>; // Apply multipliers to values
    filters?: Record<string, any>; // Filter conditions
  };
}

export interface DataSourcePlugin {
  readonly name: string;
  readonly config: DataSourceConfig;
  
  /**
   * Validate the configuration for this data source
   */
  validateConfig(): Promise<boolean>;
  
  /**
   * Fetch data from the external API
   */
  fetchData(): Promise<any[]>;
  
  /**
   * Transform external API data to our standard format
   */
  transformData(rawData: any[]): Promise<MeasurementData[]>;
  
  /**
   * Health check for the data source
   */
  healthCheck(): Promise<boolean>;
  
  /**
   * Get metadata about this data source
   */
  getMetadata(): {
    description: string;
    version: string;
    supportedMeasurements: string[];
    expectedUpdateFrequency: string;
  };
}

export interface DataSourceRegistry {
  register(plugin: DataSourcePlugin): void;
  unregister(name: string): void;
  get(name: string): DataSourcePlugin | undefined;
  getAll(): DataSourcePlugin[];
  getEnabled(): DataSourcePlugin[];
}