# Database Management

This directory contains all database-related files for the AirGradient Map API, organized into a production-ready structure that separates schema initialization from seed data.

## 📁 Directory Structure

```
database/
├── init.sql                    # Schema initialization (tables, indexes, functions)
├── setup.sh                   # Database setup automation script
├── README.md                  # This file
├── migrations/                # Version-controlled schema changes
│   └── 20240101000001_add_performance_indexes.sql
└── seeds/                     # Environment-specific seed data
    ├── development.sql        # Sample data for development
    ├── test.sql               # Test data for unit/integration tests
    └── production.sql         # Essential production data only
```

## 🚀 Quick Start

### Development Setup

```bash
# Option 1: Using npm scripts (recommended)
npm run db:setup

# Option 2: Using Docker Compose (includes database)
docker-compose up -d

# Option 3: Manual setup
./database/setup.sh --environment development
```

### Test Database Setup

```bash
# Set up test database
npm run db:setup:test

# Or specify test environment
./database/setup.sh --environment test
```

### Production Setup

```bash
# ⚠️  PRODUCTION ONLY - Use with caution
npm run db:setup:prod

# Or with explicit environment
./database/setup.sh --environment production
```

## 📋 Setup Script Options

The `setup.sh` script provides flexible database management:

```bash
# Full setup (schema + migrations + seeds)
./database/setup.sh

# Initialize schema only
./database/setup.sh --init

# Run migrations only
./database/setup.sh --migrate-only

# Seed data only (requires existing schema)
./database/setup.sh --seed-only

# Reset database (⚠️  DELETES ALL DATA!)
./database/setup.sh --reset

# Specify environment
./database/setup.sh --environment test
```

## 🏗️ Database Schema

### Core Tables

#### `location`
Stores sensor locations and metadata:
- `id` - Primary key
- `coordinate` - PostGIS Point geometry (EPSG:3857)
- `sensor_type` - Enum: 'Small Sensor' | 'Reference'
- `location_name` - Human-readable name
- `timezone` - Location timezone
- `data_source` - 'AirGradient' | 'OpenAQ'

#### `measurement` (Partitioned)
Time-series air quality measurements:
- `location_id` - Foreign key to location
- `pm25`, `pm10` - Particulate matter (µg/m³)
- `atmp` - Temperature (°C)
- `rhum` - Humidity (%)
- `rco2` - CO2 (ppm)
- `o3`, `no2` - Gas concentrations
- `measured_at` - Measurement timestamp
- **Partitioned by month** for performance

### Key Features

1. **PostGIS Integration**: Full geospatial support with indexes
2. **Time Partitioning**: Monthly partitions for efficient querying
3. **Performance Indexes**: Optimized for common query patterns
4. **Data Validation**: Constraints and functions for data integrity
5. **Monitoring Functions**: Built-in health checks and statistics

## 🔧 Environment Variables

Configure database connection:

```bash
export DB_HOST=localhost          # Database host
export DB_PORT=5432               # Database port  
export DB_NAME=agmap              # Database name
export DB_USER=postgres           # Database user
export DB_PASSWORD=password       # Database password
export ENVIRONMENT=development    # Environment (development|test|production)
```

## 📊 Monitoring & Maintenance

### Health Checks

```sql
-- Database health check
SELECT * FROM health_check_database();

-- Table statistics
SELECT * FROM get_table_stats();

-- Production metrics
SELECT * FROM production_metrics;
```

### Maintenance Functions

```sql
-- Create new monthly partitions
SELECT maintenance_create_measurement_partitions(3);

-- Archive old data (365+ days)
SELECT * FROM archive_old_data(365);

-- Update table statistics
SELECT update_table_statistics();

-- Clean old measurements (90+ days)
SELECT cleanup_old_measurements(90);
```

## 🧪 Testing Data

### Test Database Features

- **Predictable Data**: Known values for consistent testing
- **Edge Cases**: Boundary conditions and null values  
- **Reset Function**: `SELECT reset_test_data();`
- **Helpers**: `get_test_measurement_count()` for validation

### Test Data Pattern

```sql
-- Location 1: Normal readings
-- Location 2: High pollution
-- Location 3: Reference station
-- Location 4: Boundary values (0, max)
-- Location 5: NULL values and edge cases
```

## 🔒 Security & Permissions

### Database Users

- **Application User**: Full access to `location` and `measurement`
- **Monitor User**: Read-only access for monitoring tools
- **Backup User**: Read access for backup operations

### Row Level Security (Optional)

The schema supports RLS for multi-tenant scenarios:

```sql
-- Enable RLS
ALTER TABLE location ENABLE ROW LEVEL SECURITY;

-- Create access policies
CREATE POLICY location_access_policy ON location
    FOR ALL TO agmap_api
    USING (owner_id = current_user_id());
```

## 📈 Performance Optimization

### Indexes

- **Geospatial**: GiST indexes on coordinates
- **Time-based**: B-tree indexes on timestamps
- **Composite**: Multi-column indexes for complex queries
- **Partial**: Indexes with WHERE clauses for efficiency

### Partitioning

Monthly partitions automatically created for:
- Current month
- Next 3 months
- Automatic cleanup of old partitions

### Query Optimization

```sql
-- Optimized latest measurements view
CREATE VIEW latest_measurements AS ...

-- Efficient geographic queries
SELECT * FROM location 
WHERE ST_Within(coordinate, ST_MakeEnvelope(...));

-- Time-range queries use partition pruning
SELECT * FROM measurement 
WHERE measured_at >= NOW() - INTERVAL '6 hours';
```

## 🔄 Migration Management

### Creating Migrations

1. Create file: `migrations/YYYYMMDD_HHMMSS_description.sql`
2. Include version in `schema_migrations` table
3. Test with `./setup.sh --migrate-only`

### Migration Example

```sql
-- Migration: Add new column
-- Version: 20240201120000_add_air_quality_index

ALTER TABLE measurement ADD COLUMN aqi INTEGER;
CREATE INDEX idx_measurement_aqi ON measurement(aqi) WHERE aqi IS NOT NULL;

INSERT INTO schema_migrations (version) VALUES ('20240201120000_add_air_quality_index');
```

## 🐛 Troubleshooting

### Common Issues

**Connection Failed**
```bash
# Check PostgreSQL service
systemctl status postgresql

# Verify connection parameters
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME
```

**Permission Denied**
```bash
# Check database ownership
sudo -u postgres psql -c "\l"

# Grant necessary permissions
GRANT ALL PRIVILEGES ON DATABASE agmap TO your_user;
```

**Partition Issues**
```sql
-- Check partition structure
SELECT * FROM pg_partitions WHERE tablename = 'measurement';

-- Create missing partitions
SELECT create_monthly_partition('measurement', '2024-01-01'::date);
```

### Performance Issues

```sql
-- Check slow queries
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC LIMIT 10;

-- Analyze table statistics
ANALYZE location;
ANALYZE measurement;

-- Check index usage
SELECT indexrelname, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public';
```

## 📚 References

- [PostGIS Documentation](https://postgis.net/docs/)
- [PostgreSQL Partitioning](https://www.postgresql.org/docs/current/ddl-partitioning.html)
- [pg_partman Extension](https://github.com/pgpartman/pg_partman)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)

## ✅ Best Practices

1. **Always backup** before running migrations in production
2. **Test migrations** in staging environment first  
3. **Monitor query performance** after schema changes
4. **Use transactions** for multi-statement migrations
5. **Document changes** in migration files
6. **Validate data integrity** after major changes
7. **Set up automated backups** for production databases

---

**Need Help?** Check the [DEPLOYMENT.md](../DEPLOYMENT.md) for production setup or contact the development team.