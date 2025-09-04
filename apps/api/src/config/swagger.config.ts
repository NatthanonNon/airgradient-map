import { DocumentBuilder } from '@nestjs/swagger';

export const createSwaggerConfig = () => {
  const config = new DocumentBuilder()
    .setTitle('AirGradient Map API')
    .setDescription(
      `
**AirGradient Map API** - Access real-time and historical air quality data from the global AirGradient monitoring network.

## Features
- 🌍 Real-time air quality data from thousands of sensors worldwide
- 📊 Historical data with customizable time ranges
- 🗺️ Geographic clustering for efficient map rendering
- ⚡ High-performance endpoints with response caching
- 🔒 Rate-limited API with secure access

## Measurement Types
- **pm25**: Fine particulate matter (≤2.5µm) in µg/m³
- **pm10**: Coarse particulate matter (≤10µm) in µg/m³  
- **atmp**: Ambient temperature in °C
- **rhum**: Relative humidity in %
- **rco2**: Carbon dioxide in ppm
- **o3**: Ozone concentration
- **no2**: Nitrogen dioxide concentration

## Coordinate System
All coordinates use **WGS84**: 
- Longitude: -180° to +180° (West to East)
- Latitude: -90° to +90° (South to North)

## Rate Limiting
- Default: 100 requests per minute
- Burst: Up to 200 requests allowed
- Headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset

## Response Format
All successful responses return data in the following structure:
\`\`\`json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "pagesize": 100,
    "total": 1234,
    "totalPages": 13
  }
}
\`\`\`

## Error Handling
Errors are returned with appropriate HTTP status codes and detailed messages:
\`\`\`json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/v1/measurements"
}
\`\`\`

## Data Sources
- AirGradient community sensors (CC-BY-SA 4.0)
- OpenAQ integration (CC-BY 4.0)
- Update frequency: 5-15 minutes

## Support
For questions or issues, please contact support@airgradient.com
`,
    )
    .setVersion('1.0.0')
    .setContact(
      'AirGradient Support',
      'https://www.airgradient.com/support/',
      'support@airgradient.com',
    )
    .setLicense('CC-BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/')
    .addServer('https://map-data.airgradient.com', 'Production Server')
    .addServer('https://map-data-int.airgradient.com', 'Integration Server')
    .addServer('http://localhost:3000', 'Local Development')
    .addTag('Measurements', 'Current and historical air quality measurements')
    .addTag('Locations', 'Information about monitoring locations and sensors')
    .addTag('Health', 'Service health and monitoring endpoints')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token',
      },
      'JWT-auth',
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'X-API-Key',
        in: 'header',
        description: 'API key for authentication',
      },
      'api-key',
    );

  return config.build();
};
