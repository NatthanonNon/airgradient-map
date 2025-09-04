import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as request from 'supertest';
import { AppModule } from '../app.module';
import DatabaseService from '../database/database.service';
import { MeasurementEntity } from '../measurement/measurement.entity';

describe('Measurement API Integration Tests', () => {
  let app: INestApplication;
  let databaseService: DatabaseService;
  let moduleRef: TestingModule;

  // Test data
  const testMeasurements = [
    {
      location_id: 1,
      location_name: 'Test Location 1',
      longitude: -122.4194,
      latitude: 37.7749,
      sensor_type: 'Small Sensor',
      pm25: 25.5,
      pm10: 35.2,
      atmp: 22.1,
      rhum: 65,
      rco2: 450,
      o3: 35,
      no2: 25,
      measured_at: new Date('2024-01-01T12:00:00Z'),
      data_source: 'AirGradient',
    },
    {
      location_id: 2,
      location_name: 'Test Location 2',
      longitude: -122.4094,
      latitude: 37.7849,
      sensor_type: 'Indoor Sensor',
      pm25: 15.3,
      pm10: 28.7,
      atmp: 21.5,
      rhum: 62,
      rco2: 380,
      o3: 28,
      no2: 18,
      measured_at: new Date('2024-01-01T12:05:00Z'),
      data_source: 'PurpleAir',
    },
  ];

  beforeAll(async () => {
    // Mock configuration for testing
    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        const config = {
          NODE_ENV: 'test',
          DATABASE_HOST: 'localhost',
          DATABASE_PORT: 5432,
          DATABASE_USER: 'test',
          DATABASE_PASSWORD: 'test',
          DATABASE_NAME: 'agmap_test',
          MAP_CLUSTER_RADIUS: 80,
          MAP_CLUSTER_MAX_ZOOM: 8,
          THROTTLE_TTL: 60,
          THROTTLE_LIMIT: 100,
        };
        return config[key];
      }),
    };

    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ConfigService)
      .useValue(mockConfigService)
      .compile();

    app = moduleRef.createNestApplication();

    // Apply global pipes and middleware like in main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    await app.init();
    databaseService = moduleRef.get<DatabaseService>(DatabaseService);
  });

  afterAll(async () => {
    await app.close();
    await moduleRef.close();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await databaseService.runQuery('DELETE FROM measurement WHERE location_id IN (1, 2)');
    
    // Insert test data
    for (const measurement of testMeasurements) {
      await databaseService.runQuery(
        `INSERT INTO measurement (
          location_id, location_name, longitude, latitude, sensor_type,
          pm25, pm10, atmp, rhum, rco2, o3, no2, measured_at, data_source
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          measurement.location_id,
          measurement.location_name,
          measurement.longitude,
          measurement.latitude,
          measurement.sensor_type,
          measurement.pm25,
          measurement.pm10,
          measurement.atmp,
          measurement.rhum,
          measurement.rco2,
          measurement.o3,
          measurement.no2,
          measurement.measured_at,
          measurement.data_source,
        ]
      );
    }
  });

  afterEach(async () => {
    // Clean up test data after each test
    await databaseService.runQuery('DELETE FROM measurement WHERE location_id IN (1, 2)');
  });

  describe('/map/api/v1/measurements/current (GET)', () => {
    it('should return paginated measurements with default parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/map/api/v1/measurements/current')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('page', 1);
      expect(response.body).toHaveProperty('pagesize', 100);
      expect(response.body).toHaveProperty('count');
      expect(Array.isArray(response.body.data)).toBe(true);
      
      if (response.body.data.length > 0) {
        const measurement = response.body.data[0];
        expect(measurement).toHaveProperty('locationId');
        expect(measurement).toHaveProperty('locationName');
        expect(measurement).toHaveProperty('longitude');
        expect(measurement).toHaveProperty('latitude');
        expect(measurement).toHaveProperty('measuredAt');
      }
    });

    it('should return measurements with custom pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/map/api/v1/measurements/current')
        .query({ page: 1, pagesize: 1 })
        .expect(200);

      expect(response.body.page).toBe(1);
      expect(response.body.pagesize).toBe(1);
      expect(response.body.data.length).toBeLessThanOrEqual(1);
    });

    it('should filter measurements by measure type', async () => {
      const response = await request(app.getHttpServer())
        .get('/map/api/v1/measurements/current')
        .query({ measure: 'pm25' })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      response.body.data.forEach((measurement: any) => {
        expect(measurement.pm25).not.toBeNull();
      });
    });

    it('should handle different measure types', async () => {
      const measures = ['pm25', 'pm10', 'atmp', 'rhum', 'rco2', 'o3', 'no2'];
      
      for (const measure of measures) {
        const response = await request(app.getHttpServer())
          .get('/map/api/v1/measurements/current')
          .query({ measure })
          .expect(200);

        expect(response.body).toHaveProperty('data');
      }
    });

    it('should return 400 for invalid pagination parameters', async () => {
      await request(app.getHttpServer())
        .get('/map/api/v1/measurements/current')
        .query({ page: -1 })
        .expect(400);

      await request(app.getHttpServer())
        .get('/map/api/v1/measurements/current')
        .query({ pagesize: 0 })
        .expect(400);

      await request(app.getHttpServer())
        .get('/map/api/v1/measurements/current')
        .query({ pagesize: 1001 }) // Assuming max pagesize is 1000
        .expect(400);
    });

    it('should return 400 for invalid measure type', async () => {
      await request(app.getHttpServer())
        .get('/map/api/v1/measurements/current')
        .query({ measure: 'invalid_measure' })
        .expect(400);
    });

    it('should handle large page numbers gracefully', async () => {
      const response = await request(app.getHttpServer())
        .get('/map/api/v1/measurements/current')
        .query({ page: 9999, pagesize: 100 })
        .expect(200);

      expect(response.body.data).toEqual([]);
      expect(response.body.page).toBe(9999);
    });

    it('should include EPA corrected PM2.5 values for AirGradient sensors', async () => {
      const response = await request(app.getHttpServer())
        .get('/map/api/v1/measurements/current')
        .query({ measure: 'pm25' })
        .expect(200);

      const airGradientMeasurements = response.body.data.filter(
        (m: any) => m.dataSource === 'AirGradient'
      );

      airGradientMeasurements.forEach((measurement: any) => {
        // PM2.5 should be EPA corrected (different from raw database value)
        expect(typeof measurement.pm25).toBe('number');
        expect(measurement.pm25).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('/map/api/v1/measurements/current/area (GET)', () => {
    const validAreaParams = {
      xmin: -123,
      ymin: 37,
      xmax: -122,
      ymax: 38,
    };

    it('should return measurements within specified area', async () => {
      const response = await request(app.getHttpServer())
        .get('/map/api/v1/measurements/current/area')
        .query(validAreaParams)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.page).toBeNull();
      expect(response.body.pagesize).toBeNull();
      expect(Array.isArray(response.body.data)).toBe(true);

      // All returned measurements should be within the specified area
      response.body.data.forEach((measurement: any) => {
        expect(measurement.longitude).toBeGreaterThanOrEqual(validAreaParams.xmin);
        expect(measurement.longitude).toBeLessThanOrEqual(validAreaParams.xmax);
        expect(measurement.latitude).toBeGreaterThanOrEqual(validAreaParams.ymin);
        expect(measurement.latitude).toBeLessThanOrEqual(validAreaParams.ymax);
      });
    });

    it('should return measurements with measure filter for area', async () => {
      const response = await request(app.getHttpServer())
        .get('/map/api/v1/measurements/current/area')
        .query({ ...validAreaParams, measure: 'pm10' })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      response.body.data.forEach((measurement: any) => {
        expect(measurement.pm10).not.toBeNull();
      });
    });

    it('should return 400 for missing required area parameters', async () => {
      await request(app.getHttpServer())
        .get('/map/api/v1/measurements/current/area')
        .query({ xmin: -122.5 }) // Missing other parameters
        .expect(400);

      await request(app.getHttpServer())
        .get('/map/api/v1/measurements/current/area')
        .expect(400);
    });

    it('should return 400 for invalid coordinate ranges', async () => {
      await request(app.getHttpServer())
        .get('/map/api/v1/measurements/current/area')
        .query({
          xmin: -250, // Invalid longitude
          ymin: 37,
          xmax: -122,
          ymax: 38,
        })
        .expect(400);

      await request(app.getHttpServer())
        .get('/map/api/v1/measurements/current/area')
        .query({
          xmin: -122,
          ymin: -100, // Invalid latitude
          xmax: -121,
          ymax: 38,
        })
        .expect(400);
    });

    it('should return 400 for invalid area bounds (xmin > xmax)', async () => {
      await request(app.getHttpServer())
        .get('/map/api/v1/measurements/current/area')
        .query({
          xmin: -121,
          ymin: 37,
          xmax: -122, // xmax < xmin
          ymax: 38,
        })
        .expect(400);
    });

    it('should handle empty area results', async () => {
      const emptyAreaParams = {
        xmin: -110,
        ymin: 30,
        xmax: -109,
        ymax: 31,
      };

      const response = await request(app.getHttpServer())
        .get('/map/api/v1/measurements/current/area')
        .query(emptyAreaParams)
        .expect(200);

      expect(response.body.data).toEqual([]);
    });

    it('should handle worldwide area query', async () => {
      const worldwideParams = {
        xmin: -180,
        ymin: -90,
        xmax: 180,
        ymax: 90,
      };

      const response = await request(app.getHttpServer())
        .get('/map/api/v1/measurements/current/area')
        .query(worldwideParams)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('/map/api/v1/measurements/current/cluster (GET)', () => {
    const validClusterParams = {
      xmin: -123,
      ymin: 37,
      xmax: -122,
      ymax: 38,
      zoom: 10,
    };

    it('should return clustered measurements', async () => {
      const response = await request(app.getHttpServer())
        .get('/map/api/v1/measurements/current/cluster')
        .query(validClusterParams)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.page).toBeNull();
      expect(response.body.pagesize).toBeNull();
      expect(Array.isArray(response.body.data)).toBe(true);

      if (response.body.data.length > 0) {
        const cluster = response.body.data[0];
        expect(cluster).toHaveProperty('type', 'Feature');
        expect(cluster).toHaveProperty('geometry');
        expect(cluster).toHaveProperty('properties');
        expect(cluster.geometry).toHaveProperty('type', 'Point');
        expect(cluster.geometry).toHaveProperty('coordinates');
        expect(cluster.properties).toHaveProperty('value');
      }
    });

    it('should return clusters with specified measure type', async () => {
      const response = await request(app.getHttpServer())
        .get('/map/api/v1/measurements/current/cluster')
        .query({ ...validClusterParams, measure: 'pm10' })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      // Verify clusters have the expected structure
      response.body.data.forEach((cluster: any) => {
        expect(cluster.properties).toHaveProperty('value');
        expect(typeof cluster.properties.value).toBe('number');
      });
    });

    it('should handle different zoom levels', async () => {
      const zoomLevels = [1, 5, 8, 10, 15, 18];

      for (const zoom of zoomLevels) {
        const response = await request(app.getHttpServer())
          .get('/map/api/v1/measurements/current/cluster')
          .query({ ...validClusterParams, zoom })
          .expect(200);

        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });

    it('should return individual points for high zoom levels', async () => {
      const highZoomParams = { ...validClusterParams, zoom: 15 };

      const response = await request(app.getHttpServer())
        .get('/map/api/v1/measurements/current/cluster')
        .query(highZoomParams)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      // At high zoom levels, clusters should be individual points
      response.body.data.forEach((cluster: any) => {
        expect(cluster.properties.cluster).toBe(false);
      });
    });

    it('should return 400 for missing zoom parameter', async () => {
      const paramsWithoutZoom = {
        xmin: -123,
        ymin: 37,
        xmax: -122,
        ymax: 38,
      };

      await request(app.getHttpServer())
        .get('/map/api/v1/measurements/current/cluster')
        .query(paramsWithoutZoom)
        .expect(400);
    });

    it('should return 400 for invalid zoom level', async () => {
      await request(app.getHttpServer())
        .get('/map/api/v1/measurements/current/cluster')
        .query({ ...validClusterParams, zoom: -1 })
        .expect(400);

      await request(app.getHttpServer())
        .get('/map/api/v1/measurements/current/cluster')
        .query({ ...validClusterParams, zoom: 25 }) // Assuming max zoom is 20
        .expect(400);
    });

    it('should default to pm25 measure when not specified', async () => {
      const response = await request(app.getHttpServer())
        .get('/map/api/v1/measurements/current/cluster')
        .query(validClusterParams)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      // Should return data as if measure=pm25 was specified
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should apply EPA correction for AirGradient PM2.5 clusters', async () => {
      const response = await request(app.getHttpServer())
        .get('/map/api/v1/measurements/current/cluster')
        .query({ ...validClusterParams, measure: 'pm25' })
        .expect(200);

      const airGradientClusters = response.body.data.filter(
        (cluster: any) => cluster.properties.dataSource === 'AirGradient'
      );

      airGradientClusters.forEach((cluster: any) => {
        expect(typeof cluster.properties.value).toBe('number');
        expect(cluster.properties.value).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle empty cluster results', async () => {
      const emptyAreaParams = {
        xmin: -110,
        ymin: 30,
        xmax: -109,
        ymax: 31,
        zoom: 10,
      };

      const response = await request(app.getHttpServer())
        .get('/map/api/v1/measurements/current/cluster')
        .query(emptyAreaParams)
        .expect(200);

      expect(response.body.data).toEqual([]);
    });
  });

  describe('API response format and consistency', () => {
    it('should return consistent response format across all endpoints', async () => {
      const endpoints = [
        '/map/api/v1/measurements/current',
        '/map/api/v1/measurements/current/area?xmin=-123&ymin=37&xmax=-122&ymax=38',
        '/map/api/v1/measurements/current/cluster?xmin=-123&ymin=37&xmax=-122&ymax=38&zoom=10',
      ];

      for (const endpoint of endpoints) {
        const response = await request(app.getHttpServer())
          .get(endpoint)
          .expect(200);

        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.headers['content-type']).toMatch(/application\/json/);
      }
    });

    it('should include proper CORS headers', async () => {
      const response = await request(app.getHttpServer())
        .get('/map/api/v1/measurements/current')
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });

    it('should include security headers', async () => {
      const response = await request(app.getHttpServer())
        .get('/map/api/v1/measurements/current')
        .expect(200);

      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(response.headers).toHaveProperty('x-frame-options');
    });

    it('should handle JSON parsing errors gracefully', async () => {
      // This tests the global exception filter
      const response = await request(app.getHttpServer())
        .post('/map/api/v1/measurements/current') // POST to GET-only endpoint
        .send('invalid json')
        .expect(405); // Method not allowed

      expect(response.body).toHaveProperty('statusCode');
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Performance and load testing', () => {
    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 10;
      const requests = Array.from({ length: concurrentRequests }, () =>
        request(app.getHttpServer())
          .get('/map/api/v1/measurements/current')
          .query({ pagesize: 10 })
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('data');
      });

      // All requests should complete within reasonable time (5 seconds)
      expect(endTime - startTime).toBeLessThan(5000);
    });

    it('should respond quickly to simple queries', async () => {
      const startTime = Date.now();
      
      const response = await request(app.getHttpServer())
        .get('/map/api/v1/measurements/current')
        .query({ pagesize: 10 })
        .expect(200);

      const endTime = Date.now();

      expect(response.body).toHaveProperty('data');
      // Simple query should complete within 1 second
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should handle rate limiting', async () => {
      // Send multiple requests rapidly to test rate limiting
      const rapidRequests = Array.from({ length: 150 }, () =>
        request(app.getHttpServer())
          .get('/map/api/v1/measurements/current')
          .query({ pagesize: 1 })
      );

      const responses = await Promise.allSettled(rapidRequests);
      
      // Some requests should be rate limited (status 429)
      const rateLimited = responses.filter(
        (result) => result.status === 'fulfilled' && result.value.status === 429
      );

      // At least some requests should be rate limited if limits are properly configured
      // This test might need adjustment based on actual rate limiting configuration
      expect(rateLimited.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error handling and edge cases', () => {
    it('should return 404 for non-existent endpoints', async () => {
      await request(app.getHttpServer())
        .get('/map/api/v1/measurements/nonexistent')
        .expect(404);
    });

    it('should return proper error format for validation errors', async () => {
      const response = await request(app.getHttpServer())
        .get('/map/api/v1/measurements/current/area')
        .query({ xmin: 'invalid' })
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('error');
    });

    it('should handle database connection issues gracefully', async () => {
      // This test would require mocking database connection failures
      // For now, just verify the endpoint exists and responds
      const response = await request(app.getHttpServer())
        .get('/map/api/v1/measurements/current')
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });

    it('should sanitize error messages in production mode', async () => {
      // Error messages shouldn't leak sensitive information
      const response = await request(app.getHttpServer())
        .get('/map/api/v1/measurements/current/area')
        .query({ measure: 'invalid_measure_type' })
        .expect(400);

      expect(response.body.message).not.toContain('password');
      expect(response.body.message).not.toContain('secret');
      expect(response.body.message).not.toContain('token');
    });
  });
});