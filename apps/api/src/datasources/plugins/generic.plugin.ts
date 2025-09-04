import { BaseDataSourcePlugin } from './base.plugin';

export class GenericPlugin extends BaseDataSourcePlugin {
  get name(): string {
    return this.config.name;
  }

  getMetadata() {
    return {
      description: 'Generic data source plugin for any API that follows standard patterns',
      version: '1.0.0',
      supportedMeasurements: ['pm25', 'pm10', 'atmp', 'rhum', 'rco2', 'o3', 'no2'],
      expectedUpdateFrequency: 'Configurable via cron schedule',
    };
  }

  protected getDataEndpoint(): string {
    // For generic plugin, allow custom endpoint configuration
    return this.config.apiConfig.endpoint || '/api/data';
  }

  protected extractDataFromResponse(response: any): any[] {
    // Try multiple common response patterns
    const patterns = [
      () => response,
      () => response.data,
      () => response.results,
      () => response.items,
      () => response.measurements,
      () => response.sensors,
      () => response.stations,
    ];

    for (const pattern of patterns) {
      try {
        const data = pattern();
        if (Array.isArray(data)) {
          return data;
        }
      } catch (error) {
        // Continue trying other patterns
      }
    }

    throw new Error('Unable to extract data array from response. Please check your API response format.');
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Try custom health endpoint first
      if (this.config.apiConfig.healthEndpoint) {
        const response = await this.httpClient.get(this.config.apiConfig.healthEndpoint);
        return response.status === 200;
      }

      return super.healthCheck();
    } catch (error) {
      return super.healthCheck();
    }
  }
}