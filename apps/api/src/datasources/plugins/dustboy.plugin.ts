import { BaseDataSourcePlugin } from './base.plugin';

export class DustBoyPlugin extends BaseDataSourcePlugin {
  get name(): string {
    return this.config.name;
  }

  getMetadata() {
    return {
      description: 'DustBoy air quality monitoring network in Thailand',
      version: '1.0.0',
      supportedMeasurements: ['pm25', 'pm10', 'atmp', 'rhum'],
      expectedUpdateFrequency: '5 minutes',
    };
  }

  protected getDataEndpoint(): string {
    // DustBoy API endpoint for latest measurements
    return '/api/v1/sensors/latest';
  }

  protected extractDataFromResponse(response: any): any[] {
    // DustBoy API returns data in 'stations' array
    if (response.stations && Array.isArray(response.stations)) {
      return response.stations;
    }
    
    return super.extractDataFromResponse(response);
  }

  protected async transformSingleItem(item: any): Promise<any | null> {
    // DustBoy specific transformations
    if (!item.online || item.status !== 'active') {
      // Skip offline sensors
      return null;
    }

    // Apply DustBoy specific coordinate transformation if needed
    // DustBoy might use different coordinate system
    if (item.coordinate_system === 'UTM47N') {
      const transformed = await this.transformCoordinates(
        parseFloat(item.longitude), 
        parseFloat(item.latitude)
      );
      item.longitude = transformed.longitude;
      item.latitude = transformed.latitude;
    }

    return super.transformSingleItem(item);
  }

  protected async transformCoordinates(longitude: number, latitude: number): Promise<{ longitude: number; latitude: number }> {
    // Implement UTM to WGS84 transformation if needed
    // For now, return as-is assuming coordinates are already in WGS84
    return { longitude, latitude };
  }

  async healthCheck(): Promise<boolean> {
    try {
      // DustBoy specific health check
      const response = await this.httpClient.get('/api/v1/status');
      return response.data.status === 'ok' && response.data.services.api === 'running';
    } catch (error) {
      return super.healthCheck();
    }
  }
}