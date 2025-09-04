export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  database: {
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    poolSize: parseInt(process.env.DATABASE_POOL_SIZE, 10) || 20,
    idleTimeout: parseInt(process.env.DATABASE_IDLE_TIMEOUT, 10) || 30000,
    connectionTimeout: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT, 10) || 2000,
  },
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL, 10) || 60000,
    limit: parseInt(process.env.THROTTLE_LIMIT, 10) || 100,
  },
  map: {
    clusterRadius: parseInt(process.env.MAP_CLUSTER_RADIUS, 10) || 80,
    clusterMaxZoom: parseInt(process.env.MAP_CLUSTER_MAX_ZOOM, 10) || 8,
  },
  apiKeys: {
    openaq: process.env.API_KEY_OPENAQ,
  },
  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') || [],
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableFileLogging: process.env.ENABLE_FILE_LOGGING === 'true',
  },
});
