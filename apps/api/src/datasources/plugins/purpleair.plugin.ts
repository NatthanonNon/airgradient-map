import { BaseDataSourcePlugin } from './base.plugin';

export class PurpleAirPlugin extends BaseDataSourcePlugin {
  get name(): string {
    return this.config.name;
  }

  getMetadata() {
    return {
      description: 'PurpleAir air quality sensor network',
      version: '1.0.0',
      supportedMeasurements: ['pm25', 'pm10', 'atmp', 'rhum'],
      expectedUpdateFrequency: '10 minutes',
    };
  }

  protected getDataEndpoint(): string {
    return '/sensors';
  }

  protected extractDataFromResponse(response: any): any[] {
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    }
    
    return super.extractDataFromResponse(response);
  }

  protected async transformSingleItem(item: any): Promise<any | null> {
    // PurpleAir specific filtering
    if (item.private === 1 || item.location_type !== 0) {
      return null; // Skip private sensors or indoor sensors
    }

    return super.transformSingleItem(item);
  }
}