import 'reflect-metadata';

// Jest setup file for global test configuration
jest.setTimeout(30000); // 30 second timeout for integration tests

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_HOST = 'localhost';
process.env.DATABASE_PORT = '5432';
process.env.DATABASE_USER = 'test';
process.env.DATABASE_PASSWORD = 'test';
process.env.DATABASE_NAME = 'agmap_test';
process.env.MAP_CLUSTER_RADIUS = '80';
process.env.MAP_CLUSTER_MAX_ZOOM = '8';
process.env.THROTTLE_TTL = '60';
process.env.THROTTLE_LIMIT = '100';

// Global test utilities could go here if needed