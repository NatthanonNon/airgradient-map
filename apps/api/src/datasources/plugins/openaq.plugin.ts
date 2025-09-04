import { BaseDataSourcePlugin } from './base.plugin';

export class OpenAQPlugin extends BaseDataSourcePlugin {
  get name(): string {
    return this.config.name;
  }

  getMetadata() {
    return {
      description: 'OpenAQ global air quality data platform',
      version: '1.0.0',
      supportedMeasurements: ['pm25', 'pm10', 'o3', 'no2'],
      expectedUpdateFrequency: '15 minutes',
    };
  }

  protected getDataEndpoint(): string {
    return '/latest?limit=1000';
  }

  protected extractDataFromResponse(response: any): any[] {
    if (response.results && Array.isArray(response.results)) {
      return response.results;
    }
    
    return super.extractDataFromResponse(response);
  }
}