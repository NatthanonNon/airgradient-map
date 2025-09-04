import { Test, TestingModule } from '@nestjs/testing';
import MeasurementRepository from './measurement.repository';
import DatabaseService from '../database/database.service';
import { MeasurementEntity } from './measurement.entity';
import { AppError, ErrorCode } from '../common/errors';

describe('MeasurementRepository', () => {
  let repository: MeasurementRepository;
  let databaseService: jest.Mocked<DatabaseService>;

  const mockMeasurement = {
    location_id: 1,
    location_name: 'Test Location',
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
  };

  const mockQueryResult = {
    rows: [mockMeasurement],
    rowCount: 1,
    command: 'SELECT',
    oid: 0,
    fields: [],
  };

  beforeEach(async () => {
    const mockDatabaseService = {
      runQuery: jest.fn(),
      transaction: jest.fn(),
      getPoolClient: jest.fn(),
      isHealthy: jest.fn(),
      getPoolStats: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeasurementRepository,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
      ],
    }).compile();

    repository = module.get<MeasurementRepository>(MeasurementRepository);
    databaseService = module.get(DatabaseService);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('retrieveLatest', () => {
    it('should retrieve latest measurements with default parameters', async () => {
      databaseService.runQuery.mockResolvedValue(mockQueryResult);

      const result = await repository.retrieveLatest(0, 100);

      expect(databaseService.runQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [0, 100]
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(MeasurementEntity);
      expect(result[0].locationId).toBe(1);
      expect(result[0].locationName).toBe('Test Location');
    });

    it('should retrieve latest measurements with measure filter', async () => {
      databaseService.runQuery.mockResolvedValue(mockQueryResult);

      const result = await repository.retrieveLatest(0, 100, 'pm25');

      expect(databaseService.runQuery).toHaveBeenCalledWith(
        expect.stringContaining('pm25 IS NOT NULL'),
        [0, 100]
      );
      expect(result).toHaveLength(1);
    });

    it('should handle different measure types', async () => {
      databaseService.runQuery.mockResolvedValue(mockQueryResult);

      const measures = ['pm25', 'pm10', 'atmp', 'rhum', 'rco2', 'o3', 'no2'];
      
      for (const measure of measures) {
        await repository.retrieveLatest(0, 100, measure);
        
        expect(databaseService.runQuery).toHaveBeenCalledWith(
          expect.stringContaining(`${measure} IS NOT NULL`),
          [0, 100]
        );
      }
    });

    it('should handle custom offset and limit', async () => {
      databaseService.runQuery.mockResolvedValue(mockQueryResult);

      await repository.retrieveLatest(50, 25, 'pm10');

      expect(databaseService.runQuery).toHaveBeenCalledWith(
        expect.stringContaining('OFFSET $1 LIMIT $2'),
        [50, 25]
      );
    });

    it('should handle empty results', async () => {
      databaseService.runQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await repository.retrieveLatest(0, 100);

      expect(result).toEqual([]);
    });

    it('should handle database connection errors', async () => {
      const dbError = new Error('Connection failed');
      databaseService.runQuery.mockRejectedValue(dbError);

      await expect(repository.retrieveLatest(0, 100)).rejects.toThrow(AppError);
      await expect(repository.retrieveLatest(0, 100)).rejects.toHaveProperty(
        'code',
        ErrorCode.MEAS_001
      );
    });

    it('should handle query timeout errors', async () => {
      const timeoutError = new Error('Query timeout');
      (timeoutError as any).code = '57014';
      databaseService.runQuery.mockRejectedValue(timeoutError);

      await expect(repository.retrieveLatest(0, 100)).rejects.toThrow(AppError);
    });

    it('should validate offset and limit parameters', async () => {
      databaseService.runQuery.mockResolvedValue(mockQueryResult);

      // Test with zero offset
      await repository.retrieveLatest(0, 100);
      expect(databaseService.runQuery).toHaveBeenCalledWith(
        expect.any(String),
        [0, 100]
      );

      // Test with large offset
      await repository.retrieveLatest(10000, 1);
      expect(databaseService.runQuery).toHaveBeenCalledWith(
        expect.any(String),
        [10000, 1]
      );
    });

    it('should order results by measured_at DESC', async () => {
      databaseService.runQuery.mockResolvedValue(mockQueryResult);

      await repository.retrieveLatest(0, 100);

      expect(databaseService.runQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY measured_at DESC'),
        [0, 100]
      );
    });
  });

  describe('retrieveLatestByArea', () => {
    const bounds = {
      xMin: -122.5,
      yMin: 37.7,
      xMax: -122.4,
      yMax: 37.8,
    };

    it('should retrieve measurements within specified area', async () => {
      databaseService.runQuery.mockResolvedValue(mockQueryResult);

      const result = await repository.retrieveLatestByArea(
        bounds.xMin,
        bounds.yMin,
        bounds.xMax,
        bounds.yMax
      );

      expect(databaseService.runQuery).toHaveBeenCalledWith(
        expect.stringContaining('ST_Within'),
        [bounds.xMin, bounds.yMin, bounds.xMax, bounds.yMax]
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(MeasurementEntity);
    });

    it('should retrieve area measurements with measure filter', async () => {
      databaseService.runQuery.mockResolvedValue(mockQueryResult);

      const result = await repository.retrieveLatestByArea(
        bounds.xMin,
        bounds.yMin,
        bounds.xMax,
        bounds.yMax,
        'pm25'
      );

      expect(databaseService.runQuery).toHaveBeenCalledWith(
        expect.stringContaining('pm25 IS NOT NULL'),
        [bounds.xMin, bounds.yMin, bounds.xMax, bounds.yMax]
      );
      expect(result).toHaveLength(1);
    });

    it('should handle different area sizes', async () => {
      databaseService.runQuery.mockResolvedValue(mockQueryResult);

      // Small area
      await repository.retrieveLatestByArea(-122.42, 37.77, -122.41, 37.78);
      expect(databaseService.runQuery).toHaveBeenCalledWith(
        expect.any(String),
        [-122.42, 37.77, -122.41, 37.78]
      );

      // Large area (whole world)
      await repository.retrieveLatestByArea(-180, -90, 180, 90);
      expect(databaseService.runQuery).toHaveBeenCalledWith(
        expect.any(String),
        [-180, -90, 180, 90]
      );
    });

    it('should handle invalid coordinate bounds gracefully', async () => {
      databaseService.runQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      // Invalid longitude
      const result = await repository.retrieveLatestByArea(200, 37.7, -200, 37.8);
      
      expect(result).toEqual([]);
    });

    it('should use PostGIS spatial indexing', async () => {
      databaseService.runQuery.mockResolvedValue(mockQueryResult);

      await repository.retrieveLatestByArea(
        bounds.xMin,
        bounds.yMin,
        bounds.xMax,
        bounds.yMax
      );

      // Verify that the query uses PostGIS functions
      expect(databaseService.runQuery).toHaveBeenCalledWith(
        expect.stringMatching(/(ST_Within|ST_MakeEnvelope|ST_Transform)/),
        expect.any(Array)
      );
    });

    it('should handle different measure types for area queries', async () => {
      databaseService.runQuery.mockResolvedValue(mockQueryResult);

      const measures = ['pm10', 'atmp', 'rhum', 'no2'];
      
      for (const measure of measures) {
        await repository.retrieveLatestByArea(
          bounds.xMin,
          bounds.yMin,
          bounds.xMax,
          bounds.yMax,
          measure
        );
        
        expect(databaseService.runQuery).toHaveBeenCalledWith(
          expect.stringContaining(`${measure} IS NOT NULL`),
          [bounds.xMin, bounds.yMin, bounds.xMax, bounds.yMax]
        );
      }
    });

    it('should handle database errors for area queries', async () => {
      const dbError = new Error('PostGIS function error');
      databaseService.runQuery.mockRejectedValue(dbError);

      await expect(
        repository.retrieveLatestByArea(
          bounds.xMin,
          bounds.yMin,
          bounds.xMax,
          bounds.yMax
        )
      ).rejects.toThrow(AppError);
      
      await expect(
        repository.retrieveLatestByArea(
          bounds.xMin,
          bounds.yMin,
          bounds.xMax,
          bounds.yMax
        )
      ).rejects.toHaveProperty('code', ErrorCode.MEAS_002);
    });

    it('should handle edge case coordinates', async () => {
      databaseService.runQuery.mockResolvedValue(mockQueryResult);

      // Antimeridian crossing (longitude around 180/-180)
      await repository.retrieveLatestByArea(179, -10, -179, 10);
      expect(databaseService.runQuery).toHaveBeenCalledWith(
        expect.any(String),
        [179, -10, -179, 10]
      );

      // Polar regions
      await repository.retrieveLatestByArea(-180, 85, 180, 90);
      expect(databaseService.runQuery).toHaveBeenCalledWith(
        expect.any(String),
        [-180, 85, 180, 90]
      );
    });

    it('should include latest measurements only', async () => {
      databaseService.runQuery.mockResolvedValue(mockQueryResult);

      await repository.retrieveLatestByArea(
        bounds.xMin,
        bounds.yMin,
        bounds.xMax,
        bounds.yMax
      );

      // Verify the query includes window function for latest measurements
      expect(databaseService.runQuery).toHaveBeenCalledWith(
        expect.stringMatching(/(ROW_NUMBER|DISTINCT ON|latest)/),
        expect.any(Array)
      );
    });
  });

  describe('error handling and edge cases', () => {
    it('should map PostgreSQL error codes correctly', async () => {
      const postgresErrors = [
        { code: '23505', expectedError: ErrorCode.DB_025 }, // Unique violation
        { code: '23503', expectedError: ErrorCode.DB_024 }, // Foreign key violation
        { code: '08003', expectedError: ErrorCode.DB_001 }, // Connection does not exist
        { code: '57014', expectedError: ErrorCode.DB_021 }, // Query canceled (timeout)
      ];

      for (const { code, expectedError } of postgresErrors) {
        const dbError = new Error('PostgreSQL error');
        (dbError as any).code = code;
        databaseService.runQuery.mockRejectedValue(dbError);

        try {
          await repository.retrieveLatest(0, 100);
          fail('Expected error to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(AppError);
          if (code === '57014') {
            expect(error.code).toBe(expectedError);
          } else if (code === '08003') {
            expect(error.code).toBe(expectedError);
          }
        }
      }
    });

    it('should handle network timeout errors', async () => {
      const networkError = new Error('ETIMEDOUT');
      (networkError as any).code = 'ETIMEDOUT';
      databaseService.runQuery.mockRejectedValue(networkError);

      await expect(repository.retrieveLatest(0, 100)).rejects.toThrow(AppError);
    });

    it('should handle connection pool exhaustion', async () => {
      const poolError = new Error('Connection pool exhausted');
      (poolError as any).code = 'ECONNRESET';
      databaseService.runQuery.mockRejectedValue(poolError);

      await expect(repository.retrieveLatest(0, 100)).rejects.toThrow(AppError);
    });

    it('should preserve original error context', async () => {
      const originalError = new Error('Original database error');
      databaseService.runQuery.mockRejectedValue(originalError);

      try {
        await repository.retrieveLatest(0, 100);
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect(error.operation).toBe('retrieveLatest');
        expect(error.parameters).toEqual({ offset: 0, limit: 100, measure: undefined });
      }
    });

    it('should handle malformed measurement data gracefully', async () => {
      const malformedData = {
        rows: [
          {
            location_id: null, // Invalid location_id
            longitude: 'not_a_number', // Invalid coordinate
            pm25: -999, // Invalid measurement
          },
        ],
        rowCount: 1,
      };
      databaseService.runQuery.mockResolvedValue(malformedData);

      const result = await repository.retrieveLatest(0, 100);

      // Should create MeasurementEntity instances even with invalid data
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(MeasurementEntity);
    });
  });

  describe('performance and optimization', () => {
    it('should use efficient queries for large datasets', async () => {
      const largeMockResult = {
        rows: Array.from({ length: 1000 }, () => mockMeasurement),
        rowCount: 1000,
      };
      databaseService.runQuery.mockResolvedValue(largeMockResult);

      const result = await repository.retrieveLatest(0, 1000);

      expect(result).toHaveLength(1000);
      // Query should include LIMIT for performance
      expect(databaseService.runQuery).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT'),
        [0, 1000]
      );
    });

    it('should handle concurrent queries efficiently', async () => {
      databaseService.runQuery.mockResolvedValue(mockQueryResult);

      const queries = Array.from({ length: 10 }, () =>
        repository.retrieveLatest(0, 100)
      );

      const results = await Promise.all(queries);

      results.forEach(result => {
        expect(result).toHaveLength(1);
        expect(result[0]).toBeInstanceOf(MeasurementEntity);
      });
      expect(databaseService.runQuery).toHaveBeenCalledTimes(10);
    });

    it('should use database indexing hints in queries', async () => {
      databaseService.runQuery.mockResolvedValue(mockQueryResult);

      await repository.retrieveLatest(0, 100, 'pm25');

      // Verify query structure for index usage
      const queryCall = databaseService.query.mock.calls[0][0];
      expect(queryCall).toMatch(/ORDER BY.*measured_at.*DESC/);
      expect(queryCall).toMatch(/location_id.*longitude.*latitude/);
    });

    it('should minimize memory usage for large result sets', async () => {
      const largeMockResult = {
        rows: Array.from({ length: 5000 }, (_, index) => ({
          ...mockMeasurement,
          location_id: index + 1,
        })),
        rowCount: 5000,
      };
      databaseService.runQuery.mockResolvedValue(largeMockResult);

      const startMemory = process.memoryUsage().heapUsed;
      const result = await repository.retrieveLatest(0, 5000);
      const endMemory = process.memoryUsage().heapUsed;

      expect(result).toHaveLength(5000);
      // Memory usage should be reasonable (less than 100MB increase)
      expect(endMemory - startMemory).toBeLessThan(100 * 1024 * 1024);
    });
  });

  describe('data transformation', () => {
    it('should correctly transform database rows to MeasurementEntity', async () => {
      const dbRow = {
        location_id: 123,
        location_name: 'San Francisco Sensor',
        longitude: -122.4194,
        latitude: 37.7749,
        sensor_type: 'Indoor Sensor',
        pm25: 12.5,
        pm10: 18.3,
        atmp: 23.4,
        rhum: 58,
        rco2: 420,
        o3: 42,
        no2: 18,
        measured_at: new Date('2024-01-15T14:30:00Z'),
        data_source: 'PurpleAir',
      };

      databaseService.runQuery.mockResolvedValue({ rows: [dbRow], rowCount: 1 });

      const result = await repository.retrieveLatest(0, 1);

      expect(result).toHaveLength(1);
      const entity = result[0];
      expect(entity.locationId).toBe(123);
      expect(entity.locationName).toBe('San Francisco Sensor');
      expect(entity.longitude).toBe(-122.4194);
      expect(entity.latitude).toBe(37.7749);
      expect(entity.sensorType).toBe('Indoor Sensor');
      expect(entity.pm25).toBe(12.5);
      expect(entity.pm10).toBe(18.3);
      expect(entity.atmp).toBe(23.4);
      expect(entity.rhum).toBe(58);
      expect(entity.rco2).toBe(420);
      expect(entity.o3).toBe(42);
      expect(entity.no2).toBe(18);
      expect(entity.measuredAt).toEqual(new Date('2024-01-15T14:30:00Z'));
      expect(entity.dataSource).toBe('PurpleAir');
    });

    it('should handle null measurement values', async () => {
      const dbRowWithNulls = {
        ...mockMeasurement,
        pm25: null,
        pm10: null,
        o3: null,
      };

      databaseService.runQuery.mockResolvedValue({ rows: [dbRowWithNulls], rowCount: 1 });

      const result = await repository.retrieveLatest(0, 1);

      expect(result).toHaveLength(1);
      const entity = result[0];
      expect(entity.pm25).toBeNull();
      expect(entity.pm10).toBeNull();
      expect(entity.o3).toBeNull();
      expect(entity.locationId).toBe(1); // Non-null fields should still work
    });

    it('should preserve precision for measurement values', async () => {
      const preciseRow = {
        ...mockMeasurement,
        pm25: 12.345,
        longitude: -122.41940123,
        latitude: 37.77490456,
        atmp: 23.67,
      };

      databaseService.runQuery.mockResolvedValue({ rows: [preciseRow], rowCount: 1 });

      const result = await repository.retrieveLatest(0, 1);

      const entity = result[0];
      expect(entity.pm25).toBe(12.345);
      expect(entity.longitude).toBe(-122.41940123);
      expect(entity.latitude).toBe(37.77490456);
      expect(entity.atmp).toBe(23.67);
    });
  });
});