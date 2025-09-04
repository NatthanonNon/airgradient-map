# AirGradient Map API - Production Deployment Guide

## Table of Contents
- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Deployment Methods](#deployment-methods)
- [Security Checklist](#security-checklist)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- Node.js 20.x or higher
- PostgreSQL 14+ 
- Redis 6+ (optional, for caching)
- Docker & Docker Compose (for containerized deployment)
- SSL certificates for HTTPS

## Environment Configuration

### 1. Create Production Environment File

```bash
cp .env.production.example .env.production
```

### 2. Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | API server port | `3000` |
| `DATABASE_HOST` | PostgreSQL host | `localhost` |
| `DATABASE_PORT` | PostgreSQL port | `5432` |
| `DATABASE_USER` | Database user | `agmap_user` |
| `DATABASE_PASSWORD` | Database password | `secure_password` |
| `DATABASE_NAME` | Database name | `agmap` |
| `JWT_SECRET` | JWT signing secret | `random_32_char_string` |
| `ENCRYPTION_KEY` | Data encryption key | `random_32_char_string` |

### 3. Optional Configuration

```bash
# Performance Tuning
DATABASE_POOL_SIZE=20
DATABASE_IDLE_TIMEOUT=30000
DATABASE_CONNECTION_TIMEOUT=2000

# Rate Limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=100

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx
NEW_RELIC_LICENSE_KEY=xxx
```

## Database Setup

### 1. Create Database and User

```sql
CREATE USER agmap_user WITH PASSWORD 'secure_password';
CREATE DATABASE agmap OWNER agmap_user;
GRANT ALL PRIVILEGES ON DATABASE agmap TO agmap_user;
```

### 2. Run Migrations

```bash
npm run migration:run
```

### 3. Create Indexes for Performance

```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_measurements_location_id ON measurements(location_id);
CREATE INDEX idx_measurements_created_at ON measurements(created_at DESC);
CREATE INDEX idx_locations_coordinates ON locations USING GIST(point(longitude, latitude));
```

## Deployment Methods

### Method 1: Docker Deployment (Recommended)

#### Build and Run with Docker Compose

```bash
# Build the image
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

#### Production Docker Compose Override

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  api:
    image: airgradient/map-api:latest
    restart: always
    deploy:
      replicas: 2
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
```

Run with:
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Method 2: PM2 Deployment

#### Install PM2

```bash
npm install -g pm2
```

#### Create PM2 Configuration

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'agmap-api',
    script: './dist/main.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    merge_logs: true,
    max_memory_restart: '1G',
    autorestart: true,
    watch: false,
  }]
};
```

#### Start Application

```bash
# Build the application
npm run build

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup startup script
pm2 startup
```

### Method 3: Kubernetes Deployment

See `k8s/` directory for Kubernetes manifests.

## Security Checklist

### Pre-Deployment

- [ ] Change all default passwords
- [ ] Generate strong JWT_SECRET (min 32 characters)
- [ ] Generate strong ENCRYPTION_KEY
- [ ] Update CORS origins for your domain
- [ ] Enable HTTPS/SSL certificates
- [ ] Configure firewall rules
- [ ] Disable debug mode
- [ ] Remove development endpoints
- [ ] Update API documentation URLs

### Database Security

- [ ] Use connection pooling
- [ ] Enable SSL for database connections
- [ ] Regular backups configured
- [ ] User permissions properly scoped
- [ ] Parameterized queries only (no raw SQL)

### API Security

- [ ] Rate limiting enabled
- [ ] Helmet.js configured
- [ ] Input validation on all endpoints
- [ ] API key authentication enabled
- [ ] Request size limits configured
- [ ] CORS properly configured
- [ ] Security headers set

## Monitoring

### Health Checks

```bash
# Basic health check
curl http://localhost:3000/health

# Readiness check
curl http://localhost:3000/health/ready

# Liveness check
curl http://localhost:3000/health/live
```

### Logging

Logs are written to:
- Development: Console output
- Production: `/app/logs/` directory

### Metrics to Monitor

1. **Application Metrics**
   - Request rate
   - Response times
   - Error rate
   - Active connections

2. **Database Metrics**
   - Connection pool usage
   - Query performance
   - Slow queries
   - Connection errors

3. **System Metrics**
   - CPU usage
   - Memory usage
   - Disk I/O
   - Network traffic

### Recommended Monitoring Tools

- **APM**: New Relic, DataDog, or AppDynamics
- **Error Tracking**: Sentry or Rollbar
- **Uptime**: Pingdom or UptimeRobot
- **Logs**: ELK Stack or Datadog Logs

## Performance Optimization

### 1. Enable Response Caching

```typescript
// Add to controllers
@UseInterceptors(CacheInterceptor)
@CacheTTL(300) // 5 minutes
```

### 2. Database Connection Pooling

```env
DATABASE_POOL_SIZE=20
DATABASE_IDLE_TIMEOUT=30000
```

### 3. Enable Compression

Already configured in `main.ts` with compression middleware.

### 4. Use CDN for Static Assets

Configure CloudFlare or AWS CloudFront for API responses.

## Troubleshooting

### Common Issues

#### Port Already in Use

```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>
```

#### Database Connection Failed

1. Check database credentials
2. Verify database is running
3. Check network connectivity
4. Review firewall rules

#### High Memory Usage

1. Check for memory leaks
2. Adjust Node.js memory limit
3. Review database connection pool
4. Enable memory monitoring

#### Slow Response Times

1. Enable query logging
2. Add database indexes
3. Implement caching
4. Review N+1 query problems

### Debug Mode

Enable debug logging:

```bash
NODE_ENV=development npm start
```

### Support

For production support issues:
- Email: support@airgradient.com
- Documentation: https://docs.airgradient.com
- GitHub Issues: https://github.com/airgradienthq/map-api/issues

## Backup and Recovery

### Database Backup

```bash
# Manual backup
pg_dump -h localhost -U agmap_user -d agmap > backup_$(date +%Y%m%d).sql

# Restore from backup
psql -h localhost -U agmap_user -d agmap < backup_20240101.sql
```

### Automated Backups

Add to crontab:
```bash
0 2 * * * pg_dump -h localhost -U agmap_user -d agmap > /backups/agmap_$(date +\%Y\%m\%d).sql
```

## Updates and Maintenance

### Rolling Updates

```bash
# Pull latest code
git pull origin main

# Install dependencies
npm ci

# Build application
npm run build

# Restart with zero downtime (PM2)
pm2 reload agmap-api
```

### Database Migrations

```bash
# Generate migration
npm run migration:generate -- -n MigrationName

# Run migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

## License

This project is licensed under the terms specified in the LICENSE file.