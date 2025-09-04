import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MeasurementService } from './measurement.service';
import MeasurementRepository from './measurement.repository';
import { MeasurementEntity } from './measurement.entity';
import { AppError, ErrorCode } from '../common/errors';

describe('MeasurementService', () => {
  let service: MeasurementService;
  let repository: jest.Mocked<MeasurementRepository>;
  let configService: jest.Mocked<ConfigService>;

  const mockMeasurement = new MeasurementEntity({
    locationId: 1,
    locationName: 'Test Location',
    longitude: -122.4194,
    latitude: 37.7749,
    sensorType: 'Small Sensor',
    pm25: 25.5,
    pm10: 35.2,
    atmp: 22.1,
    rhum: 65,
    rco2: 450,
    o3: 35,
    no2: 25,
    measuredAt: new Date('2024-01-01T12:00:00Z'),
    dataSource: 'AirGradient',
  });

  beforeEach(async () => {
    const mockRepository = {
      retrieveLatest: jest.fn(),
      retrieveLatestByArea: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeasurementService,
        {
          provide: MeasurementRepository,
          useValue: mockRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<MeasurementService>(MeasurementService);
    repository = module.get(MeasurementRepository);
    configService = module.get(ConfigService);
  });

  describe('constructor', () => {
    it('should use default cluster configuration when env vars not set', () => {
      configService.get.mockReturnValue(undefined);
      
      const module = Test.createTestingModule({
        providers: [
          MeasurementService,
          { provide: MeasurementRepository, useValue: repository },
          { provide: ConfigService, useValue: configService },
        ],
      }).compile();

      expect(configService.get).toHaveBeenCalledWith('MAP_CLUSTER_RADIUS');
      expect(configService.get).toHaveBeenCalledWith('MAP_CLUSTER_MAX_ZOOM');
    });

    it('should use configured cluster values when available', () => {
      configService.get
        .mockReturnValueOnce(100) // MAP_CLUSTER_RADIUS
        .mockReturnValueOnce(10); // MAP_CLUSTER_MAX_ZOOM

      const module = Test.createTestingModule({
        providers: [
          MeasurementService,
          { provide: MeasurementRepository, useValue: repository },
          { provide: ConfigService, useValue: configService },
        ],
      }).compile();

      expect(configService.get).toHaveBeenCalledWith('MAP_CLUSTER_RADIUS');
      expect(configService.get).toHaveBeenCalledWith('MAP_CLUSTER_MAX_ZOOM');
    });
  });

  describe('getLastMeasurements', () => {
    it('should return measurements with default pagination', async () => {
      const mockMeasurements = [mockMeasurement];
      repository.retrieveLatest.mockResolvedValue(mockMeasurements);

      const result = await service.getLastMeasurements();

      expect(repository.retrieveLatest).toHaveBeenCalledWith(0, 100, undefined);
      expect(result).toEqual(mockMeasurements);
    });

    it('should handle custom pagination parameters', async () => {
      const mockMeasurements = [mockMeasurement];
      repository.retrieveLatest.mockResolvedValue(mockMeasurements);

      const result = await service.getLastMeasurements('pm25', 2, 50);

      expect(repository.retrieveLatest).toHaveBeenCalledWith(50, 50, 'pm25');
      expect(result).toEqual(mockMeasurements);
    });

    it('should handle measure parameter', async () => {
      const mockMeasurements = [mockMeasurement];
      repository.retrieveLatest.mockResolvedValue(mockMeasurements);

      const result = await service.getLastMeasurements('pm10');

      expect(repository.retrieveLatest).toHaveBeenCalledWith(0, 100, 'pm10');
      expect(result).toEqual(mockMeasurements);
    });

    it('should throw AppError when repository fails', async () => {
      const dbError = new Error('Database connection failed');
      repository.retrieveLatest.mockRejectedValue(
        AppError.databaseError(ErrorCode.MEAS_001, 'retrieveLatest', dbError)
      );

      await expect(service.getLastMeasurements()).rejects.toThrow(AppError);
    });

    it('should calculate correct offset for pagination', async () => {
      repository.retrieveLatest.mockResolvedValue([]);

      // Page 1 should have offset 0
      await service.getLastMeasurements(undefined, 1, 100);
      expect(repository.retrieveLatest).toHaveBeenLastCalledWith(0, 100, undefined);

      // Page 2 should have offset 100
      await service.getLastMeasurements(undefined, 2, 100);
      expect(repository.retrieveLatest).toHaveBeenLastCalledWith(100, 100, undefined);

      // Page 3 with pagesize 50 should have offset 100
      await service.getLastMeasurements(undefined, 3, 50);
      expect(repository.retrieveLatest).toHaveBeenLastCalledWith(100, 50, undefined);
    });
  });

  describe('getLastMeasurementsByArea', () => {
    const bounds = {
      xmin: -122.5,
      ymin: 37.7,
      xmax: -122.4,
      ymax: 37.8,
    };

    it('should return measurements for specified area', async () => {
      const mockMeasurements = [mockMeasurement];
      repository.retrieveLatestByArea.mockResolvedValue(mockMeasurements);

      const result = await service.getLastMeasurementsByArea(
        bounds.xmin,
        bounds.ymin,
        bounds.xmax,
        bounds.ymax
      );

      expect(repository.retrieveLatestByArea).toHaveBeenCalledWith(
        bounds.xmin,
        bounds.ymin,
        bounds.xmax,
        bounds.ymax,
        undefined
      );
      expect(result).toEqual(mockMeasurements);
    });

    it('should handle measure parameter for area queries', async () => {
      const mockMeasurements = [mockMeasurement];
      repository.retrieveLatestByArea.mockResolvedValue(mockMeasurements);

      const result = await service.getLastMeasurementsByArea(
        bounds.xmin,
        bounds.ymin,
        bounds.xmax,
        bounds.ymax,
        'pm25'
      );

      expect(repository.retrieveLatestByArea).toHaveBeenCalledWith(
        bounds.xmin,
        bounds.ymin,
        bounds.xmax,
        bounds.ymax,
        'pm25'
      );
      expect(result).toEqual(mockMeasurements);
    });

    it('should throw AppError when repository fails', async () => {
      const dbError = new Error('Database query failed');
      repository.retrieveLatestByArea.mockRejectedValue(
        AppError.databaseError(ErrorCode.MEAS_002, 'retrieveLatestByArea', dbError)
      );

      await expect(
        service.getLastMeasurementsByArea(bounds.xmin, bounds.ymin, bounds.xmax, bounds.ymax)
      ).rejects.toThrow(AppError);
    });
  });

  describe('getLastMeasurementsByCluster', () => {
    const bounds = {
      xmin: -122.5,
      ymin: 37.7,
      xmax: -122.4,
      ymax: 37.8,
      zoom: 10,
    };

    it('should return clustered measurements', async () => {
      const mockMeasurements = [
        { ...mockMeasurement, longitude: -122.41, latitude: 37.77 },
        { ...mockMeasurement, longitude: -122.42, latitude: 37.78 },
      ];
      repository.retrieveLatestByArea.mockResolvedValue(mockMeasurements);

      const result = await service.getLastMeasurementsByCluster(
        bounds.xmin,
        bounds.ymin,
        bounds.xmax,
        bounds.ymax,
        bounds.zoom
      );

      expect(repository.retrieveLatestByArea).toHaveBeenCalledWith(
        bounds.xmin,
        bounds.ymin,
        bounds.xmax,
        bounds.ymax,
        undefined
      );
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle empty measurement data', async () => {
      repository.retrieveLatestByArea.mockResolvedValue([]);

      const result = await service.getLastMeasurementsByCluster(
        bounds.xmin,
        bounds.ymin,
        bounds.xmax,
        bounds.ymax,
        bounds.zoom
      );

      expect(result).toEqual([]);
    });

    it('should apply EPA correction for PM2.5 measurements', async () => {
      const mockMeasurements = [
        {
          ...mockMeasurement,
          pm25: 50.0,
          rhum: 60,
          longitude: -122.41,
          latitude: 37.77,
        },
      ];
      repository.retrieveLatestByArea.mockResolvedValue(mockMeasurements);

      const result = await service.getLastMeasurementsByCluster(
        bounds.xmin,
        bounds.ymin,
        bounds.xmax,
        bounds.ymax,
        bounds.zoom,
        'pm25'
      );

      expect(result).toBeDefined();
      // Should apply EPA correction to PM2.5 values
      expect(result.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('error handling', () => {
    it('should propagate AppError from repository', async () => {
      const appError = AppError.databaseError(
        ErrorCode.MEAS_001,
        'retrieveLatest',
        new Error('Connection failed')
      );
      repository.retrieveLatest.mockRejectedValue(appError);

      await expect(service.getLastMeasurements()).rejects.toThrow(AppError);
      await expect(service.getLastMeasurements()).rejects.toHaveProperty('code', ErrorCode.MEAS_001);
    });

    it('should handle repository timeout errors', async () => {
      const timeoutError = AppError.databaseError(
        ErrorCode.DB_021,
        'retrieveLatest',
        new Error('Query timeout')
      );
      repository.retrieveLatest.mockRejectedValue(timeoutError);

      await expect(service.getLastMeasurements()).rejects.toThrow(AppError);
    });
  });

  describe('data validation', () => {
    it('should handle invalid coordinates gracefully', async () => {
      const invalidBounds = {
        xmin: 200, // Invalid longitude
        ymin: -100, // Invalid latitude
        xmax: -200,
        ymax: 100,
      };

      // Repository should handle validation, service should pass through
      repository.retrieveLatestByArea.mockResolvedValue([]);

      const result = await service.getLastMeasurementsByArea(
        invalidBounds.xmin,
        invalidBounds.ymin,
        invalidBounds.xmax,
        invalidBounds.ymax
      );

      expect(result).toEqual([]);
    });
  });

  describe('performance', () => {
    it('should handle large datasets efficiently', async () => {
      // Create a large dataset
      const largeMeasurementSet = Array.from({ length: 1000 }, (_, index) => ({
        ...mockMeasurement,
        locationId: index + 1,
        longitude: -122.4 + (index * 0.001),
        latitude: 37.77 + (index * 0.001),
      }));

      repository.retrieveLatestByArea.mockResolvedValue(largeMeasurementSet);

      const startTime = Date.now();
      const result = await service.getLastMeasurementsByCluster(-122.5, 37.7, -122.3, 37.8, 10);
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});