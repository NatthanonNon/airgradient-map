import { BaseDataSourcePlugin } from './base.plugin';
import { getEPACorrectedPM } from '../../utils/getEpaCorrectedPM';

export class AirGradientPlugin extends BaseDataSourcePlugin {
  get name(): string {
    return this.config.name;
  }

  getMetadata() {
    return {
      description: 'AirGradient air quality sensor network',
      version: '1.0.0',
      supportedMeasurements: ['pm25', 'pm10', 'atmp', 'rhum', 'rco2'],
      expectedUpdateFrequency: '5 minutes',
    };
  }

  protected getDataEndpoint(): string {
    return '/sensors/airgradient/current';
  }

  protected extractDataFromResponse(response: any): any[] {
    // AirGradient API specific response format
    if (response.sensors && Array.isArray(response.sensors)) {
      return response.sensors;
    }
    
    return super.extractDataFromResponse(response);
  }

  protected async transformSingleItem(item: any): Promise<any | null> {
    // Apply AirGradient specific transformations
    const measurement = await super.transformSingleItem(item);
    
    if (measurement && measurement.pm25 !== undefined && measurement.rhum !== undefined) {
      // Apply EPA correction for PM2.5
      measurement.pm25 = getEPACorrectedPM(measurement.pm25, measurement.rhum);
    }

    return measurement;
  }

  async healthCheck(): Promise<boolean> {
    try {
      // AirGradient specific health check
      const response = await this.httpClient.get('/sensors/airgradient/status');
      return response.data.status === 'online';
    } catch (error) {
      return super.healthCheck();
    }
  }
}