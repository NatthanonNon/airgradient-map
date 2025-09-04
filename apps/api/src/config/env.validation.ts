import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'staging', 'production', 'test')
    .default('development'),

  PORT: Joi.number().port().default(3000),

  // Database
  DATABASE_HOST: Joi.string().required(),
  DATABASE_PORT: Joi.number().port().default(5432),
  DATABASE_USER: Joi.string().required(),
  DATABASE_PASSWORD: Joi.string().required(),
  DATABASE_NAME: Joi.string().required(),
  DATABASE_POOL_SIZE: Joi.number().min(1).max(100).default(20),
  DATABASE_IDLE_TIMEOUT: Joi.number().min(0).default(30000),
  DATABASE_CONNECTION_TIMEOUT: Joi.number().min(0).default(2000),

  // Rate limiting
  THROTTLE_TTL: Joi.number().min(1000).default(60000),
  THROTTLE_LIMIT: Joi.number().min(1).default(100),

  // Map
  MAP_CLUSTER_RADIUS: Joi.number().min(1).default(80),
  MAP_CLUSTER_MAX_ZOOM: Joi.number().min(0).max(22).default(8),

  // API Keys
  API_KEY_OPENAQ: Joi.string().optional(),

  // CORS
  CORS_ORIGINS: Joi.string().optional(),

  // Logging
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug', 'verbose').default('info'),
  ENABLE_FILE_LOGGING: Joi.boolean().default(false),

  // Security (optional for development)
  JWT_SECRET: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  ENCRYPTION_KEY: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),

  // Monitoring (optional)
  SENTRY_DSN: Joi.string().uri().optional(),
  NEW_RELIC_LICENSE_KEY: Joi.string().optional(),
});
