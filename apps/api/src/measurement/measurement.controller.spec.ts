import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { MeasurementController } from './measurement.controller';
import { MeasurementService } from './measurement.service';
import { MeasurementEntity } from './measurement.entity';
import MeasurementClusterModel from './measurementCluster.model';
import { Pagination } from '../utils/pagination.dto';
import { AppError, ErrorCode } from '../common/errors';

describe('MeasurementController', () => {
  let controller: MeasurementController;
  let measurementService: jest.Mocked<MeasurementService>;

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

  const mockCluster = new MeasurementClusterModel({
    type: 'Feature',
    id: 1,
    geometry: {
      type: 'Point',
      coordinates: [-122.4194, 37.7749],
    },
    properties: {
      cluster: false,
      locationId: 1,
      locationName: 'Test Location',
      sensorType: 'Small Sensor',
      dataSource: 'AirGradient',
      value: 25.5,
    },
  });

  beforeEach(async () => {
    const mockService = {
      getLastMeasurements: jest.fn(),
      getLastMeasurementsByArea: jest.fn(),
      getLastMeasurementsByCluster: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MeasurementController],
      providers: [
        {
          provide: MeasurementService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<MeasurementController>(MeasurementController);
    measurementService = module.get(MeasurementService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getLastMeasurements', () => {
    it('should return paginated measurements with default parameters', async () => {
      const mockMeasurements = [mockMeasurement];
      measurementService.getLastMeasurements.mockResolvedValue(mockMeasurements);

      const result = await controller.getLastMeasurements(
        { measure: undefined },
        { page: 1, pagesize: 100 }
      );

      expect(measurementService.getLastMeasurements).toHaveBeenCalledWith(
        undefined,
        1,
        100
      );
      expect(result).toBeInstanceOf(Pagination);
      expect(result.data).toEqual(mockMeasurements);
      expect(result.page).toBe(1);
      expect(result.pagesize).toBe(100);
    });

    it('should return paginated measurements with custom parameters', async () => {
      const mockMeasurements = [mockMeasurement];
      measurementService.getLastMeasurements.mockResolvedValue(mockMeasurements);

      const result = await controller.getLastMeasurements(
        { measure: 'pm25' },
        { page: 2, pagesize: 50 }
      );

      expect(measurementService.getLastMeasurements).toHaveBeenCalledWith(
        'pm25',
        2,
        50
      );
      expect(result).toBeInstanceOf(Pagination);
      expect(result.data).toEqual(mockMeasurements);
      expect(result.page).toBe(2);
      expect(result.pagesize).toBe(50);
    });

    it('should handle different measure types', async () => {
      const mockMeasurements = [mockMeasurement];
      measurementService.getLastMeasurements.mockResolvedValue(mockMeasurements);

      const measures = ['pm25', 'pm10', 'atmp', 'rhum', 'rco2', 'o3', 'no2'];
      
      for (const measure of measures) {
        await controller.getLastMeasurements(
          { measure },
          { page: 1, pagesize: 100 }
        );

        expect(measurementService.getLastMeasurements).toHaveBeenCalledWith(
          measure,
          1,
          100
        );
      }
    });

    it('should handle empty results', async () => {
      measurementService.getLastMeasurements.mockResolvedValue([]);

      const result = await controller.getLastMeasurements(
        { measure: undefined },
        { page: 1, pagesize: 100 }
      );

      expect(result).toBeInstanceOf(Pagination);
      expect(result.data).toEqual([]);
    });

    it('should propagate service errors', async () => {
      const serviceError = AppError.databaseError(
        ErrorCode.MEAS_001,
        'getLastMeasurements',
        new Error('Database connection failed')
      );
      measurementService.getLastMeasurements.mockRejectedValue(serviceError);

      await expect(
        controller.getLastMeasurements(
          { measure: undefined },
          { page: 1, pagesize: 100 }
        )
      ).rejects.toThrow(AppError);
    });

    it('should handle large page numbers', async () => {
      const mockMeasurements = [];
      measurementService.getLastMeasurements.mockResolvedValue(mockMeasurements);

      const result = await controller.getLastMeasurements(
        { measure: undefined },
        { page: 1000, pagesize: 100 }
      );

      expect(measurementService.getLastMeasurements).toHaveBeenCalledWith(
        undefined,
        1000,
        100
      );
      expect(result.data).toEqual([]);
    });
  });

  describe('getLastMeasurementsByArea', () => {
    const validArea = {
      xmin: -122.5,
      ymin: 37.7,
      xmax: -122.4,
      ymax: 37.8,
      zoom: 10,
    };

    it('should return measurements for specified area', async () => {
      const mockMeasurements = [mockMeasurement];
      measurementService.getLastMeasurementsByArea.mockResolvedValue(mockMeasurements);

      const result = await controller.getLastMeasurementsByArea(
        { measure: undefined },
        validArea
      );

      expect(measurementService.getLastMeasurementsByArea).toHaveBeenCalledWith(
        validArea.xmin,
        validArea.ymin,
        validArea.xmax,
        validArea.ymax,
        undefined
      );
      expect(result).toBeInstanceOf(Pagination);
      expect(result.data).toEqual(mockMeasurements);
      expect(result.page).toBeNull();
      expect(result.pagesize).toBeNull();
    });

    it('should handle area queries with measure parameter', async () => {
      const mockMeasurements = [mockMeasurement];
      measurementService.getLastMeasurementsByArea.mockResolvedValue(mockMeasurements);

      const result = await controller.getLastMeasurementsByArea(
        { measure: 'pm25' },
        validArea
      );

      expect(measurementService.getLastMeasurementsByArea).toHaveBeenCalledWith(
        validArea.xmin,
        validArea.ymin,
        validArea.xmax,
        validArea.ymax,
        'pm25'
      );
      expect(result.data).toEqual(mockMeasurements);
    });

    it('should handle empty area results', async () => {
      measurementService.getLastMeasurementsByArea.mockResolvedValue([]);

      const result = await controller.getLastMeasurementsByArea(
        { measure: undefined },
        validArea
      );

      expect(result.data).toEqual([]);
    });

    it('should handle different area sizes', async () => {
      const mockMeasurements = [mockMeasurement];
      measurementService.getLastMeasurementsByArea.mockResolvedValue(mockMeasurements);

      // Small area
      const smallArea = {
        xmin: -122.42,
        ymin: 37.77,
        xmax: -122.41,
        ymax: 37.78,
        zoom: 10,
      };

      await controller.getLastMeasurementsByArea(
        { measure: undefined },
        smallArea
      );

      expect(measurementService.getLastMeasurementsByArea).toHaveBeenCalledWith(
        smallArea.xmin,
        smallArea.ymin,
        smallArea.xmax,
        smallArea.ymax,
        undefined
      );

      // Large area
      const largeArea = {
        xmin: -125.0,
        ymin: 35.0,
        xmax: -120.0,
        ymax: 40.0,
        zoom: 5,
      };

      await controller.getLastMeasurementsByArea(
        { measure: undefined },
        largeArea
      );

      expect(measurementService.getLastMeasurementsByArea).toHaveBeenCalledWith(
        largeArea.xmin,
        largeArea.ymin,
        largeArea.xmax,
        largeArea.ymax,
        undefined
      );
    });

    it('should propagate service errors for area queries', async () => {
      const serviceError = AppError.databaseError(
        ErrorCode.MEAS_002,
        'getLastMeasurementsByArea',
        new Error('Database query failed')
      );
      measurementService.getLastMeasurementsByArea.mockRejectedValue(serviceError);

      await expect(
        controller.getLastMeasurementsByArea(
          { measure: undefined },
          validArea
        )
      ).rejects.toThrow(AppError);
    });
  });

  describe('getLastMeasurementsByCluster', () => {
    const validArea = {
      xmin: -122.5,
      ymin: 37.7,
      xmax: -122.4,
      ymax: 37.8,
      zoom: 10,
    };

    it('should return clustered measurements', async () => {
      const mockClusters = [mockCluster];
      measurementService.getLastMeasurementsByCluster.mockResolvedValue(mockClusters);

      const result = await controller.getLastMeasurementsByCluster(
        { measure: undefined },
        validArea
      );

      expect(measurementService.getLastMeasurementsByCluster).toHaveBeenCalledWith(
        validArea.xmin,
        validArea.ymin,
        validArea.xmax,
        validArea.ymax,
        validArea.zoom,
        undefined
      );
      expect(result).toBeInstanceOf(Pagination);
      expect(result.data).toEqual(mockClusters);
      expect(result.page).toBeNull();
      expect(result.pagesize).toBeNull();
    });

    it('should handle cluster queries with measure parameter', async () => {
      const mockClusters = [mockCluster];
      measurementService.getLastMeasurementsByCluster.mockResolvedValue(mockClusters);

      const result = await controller.getLastMeasurementsByCluster(
        { measure: 'pm10' },
        validArea
      );

      expect(measurementService.getLastMeasurementsByCluster).toHaveBeenCalledWith(
        validArea.xmin,
        validArea.ymin,
        validArea.xmax,
        validArea.ymax,
        validArea.zoom,
        'pm10'
      );
      expect(result.data).toEqual(mockClusters);
    });

    it('should handle different zoom levels', async () => {
      const mockClusters = [mockCluster];
      measurementService.getLastMeasurementsByCluster.mockResolvedValue(mockClusters);

      const zoomLevels = [1, 5, 8, 10, 15, 18];
      
      for (const zoom of zoomLevels) {
        const areaWithZoom = { ...validArea, zoom };
        
        await controller.getLastMeasurementsByCluster(
          { measure: undefined },
          areaWithZoom
        );

        expect(measurementService.getLastMeasurementsByCluster).toHaveBeenCalledWith(
          areaWithZoom.xmin,
          areaWithZoom.ymin,
          areaWithZoom.xmax,
          areaWithZoom.ymax,
          zoom,
          undefined
        );
      }
    });

    it('should handle empty cluster results', async () => {
      measurementService.getLastMeasurementsByCluster.mockResolvedValue([]);

      const result = await controller.getLastMeasurementsByCluster(
        { measure: undefined },
        validArea
      );

      expect(result.data).toEqual([]);
    });

    it('should handle cluster queries with multiple measure types', async () => {
      const mockClusters = [mockCluster];
      measurementService.getLastMeasurementsByCluster.mockResolvedValue(mockClusters);

      const measures = ['pm25', 'pm10', 'atmp', 'rhum'];
      
      for (const measure of measures) {
        await controller.getLastMeasurementsByCluster(
          { measure },
          validArea
        );

        expect(measurementService.getLastMeasurementsByCluster).toHaveBeenCalledWith(
          validArea.xmin,
          validArea.ymin,
          validArea.xmax,
          validArea.ymax,
          validArea.zoom,
          measure
        );
      }
    });

    it('should propagate service errors for cluster queries', async () => {
      const serviceError = AppError.businessError(
        ErrorCode.BIZ_001,
        'getLastMeasurementsByCluster',
        { reason: 'Clustering failed' }
      );
      measurementService.getLastMeasurementsByCluster.mockRejectedValue(serviceError);

      await expect(
        controller.getLastMeasurementsByCluster(
          { measure: undefined },
          validArea
        )
      ).rejects.toThrow(AppError);
    });
  });

  describe('validation and error handling', () => {
    it('should validate area parameters', async () => {
      const invalidArea = {
        xmin: 200, // Invalid longitude
        ymin: -100, // Invalid latitude
        xmax: -200,
        ymax: 100,
        zoom: 10,
      };

      // Service should handle validation, controller should pass through
      measurementService.getLastMeasurementsByArea.mockResolvedValue([]);

      const result = await controller.getLastMeasurementsByArea(
        { measure: undefined },
        invalidArea
      );

      expect(measurementService.getLastMeasurementsByArea).toHaveBeenCalledWith(
        invalidArea.xmin,
        invalidArea.ymin,
        invalidArea.xmax,
        invalidArea.ymax,
        undefined
      );
      expect(result.data).toEqual([]);
    });

    it('should handle service timeout errors', async () => {
      const timeoutError = AppError.databaseError(
        ErrorCode.DB_021,
        'getLastMeasurements',
        new Error('Query timeout')
      );
      measurementService.getLastMeasurements.mockRejectedValue(timeoutError);

      await expect(
        controller.getLastMeasurements(
          { measure: undefined },
          { page: 1, pagesize: 100 }
        )
      ).rejects.toThrow(AppError);
    });

    it('should handle service validation errors', async () => {
      const validationError = AppError.validationError(
        ErrorCode.VAL_001,
        'measure',
        'invalid_measure'
      );
      measurementService.getLastMeasurements.mockRejectedValue(validationError);

      await expect(
        controller.getLastMeasurements(
          { measure: 'invalid_measure' },
          { page: 1, pagesize: 100 }
        )
      ).rejects.toThrow(AppError);
    });
  });

  describe('performance and edge cases', () => {
    it('should handle large datasets efficiently', async () => {
      // Create a large mock dataset
      const largeMeasurementSet = Array.from({ length: 1000 }, (_, index) => ({
        ...mockMeasurement,
        locationId: index + 1,
        longitude: -122.4 + (index * 0.001),
        latitude: 37.77 + (index * 0.001),
      }));

      measurementService.getLastMeasurements.mockResolvedValue(largeMeasurementSet);

      const startTime = Date.now();
      const result = await controller.getLastMeasurements(
        { measure: undefined },
        { page: 1, pagesize: 1000 }
      );
      const endTime = Date.now();

      expect(result.data).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(100); // Should be very fast (controller logic)
    });

    it('should handle concurrent requests', async () => {
      const mockMeasurements = [mockMeasurement];
      measurementService.getLastMeasurements.mockResolvedValue(mockMeasurements);

      const requests = Array.from({ length: 10 }, () =>
        controller.getLastMeasurements(
          { measure: 'pm25' },
          { page: 1, pagesize: 100 }
        )
      );

      const results = await Promise.all(requests);

      results.forEach(result => {
        expect(result).toBeInstanceOf(Pagination);
        expect(result.data).toEqual(mockMeasurements);
      });
      expect(measurementService.getLastMeasurements).toHaveBeenCalledTimes(10);
    });

    it('should handle boundary coordinate values', async () => {
      const boundaryArea = {
        xmin: -180, // Minimum longitude
        ymin: -90,  // Minimum latitude
        xmax: 180,  // Maximum longitude
        ymax: 90,   // Maximum latitude
        zoom: 1,
      };

      measurementService.getLastMeasurementsByArea.mockResolvedValue([]);

      await controller.getLastMeasurementsByArea(
        { measure: undefined },
        boundaryArea
      );

      expect(measurementService.getLastMeasurementsByArea).toHaveBeenCalledWith(
        -180, -90, 180, 90, undefined
      );
    });
  });

  describe('logging and monitoring', () => {
    it('should have logger defined', () => {
      expect(controller['logger']).toBeDefined();
      expect(controller['logger']['context']).toBe('MeasurementController');
    });

    it('should handle undefined measure gracefully', async () => {
      measurementService.getLastMeasurements.mockResolvedValue([]);

      await controller.getLastMeasurements(
        { measure: undefined },
        { page: 1, pagesize: 100 }
      );

      expect(measurementService.getLastMeasurements).toHaveBeenCalledWith(
        undefined,
        1,
        100
      );
    });

    it('should handle null pagination parameters gracefully', async () => {
      measurementService.getLastMeasurementsByArea.mockResolvedValue([]);

      const result = await controller.getLastMeasurementsByArea(
        { measure: undefined },
        {
          xmin: -122.5,
          ymin: 37.7,
          xmax: -122.4,
          ymax: 37.8,
          zoom: 10,
        }
      );

      expect(result.page).toBeNull();
      expect(result.pagesize).toBeNull();
    });
  });
});