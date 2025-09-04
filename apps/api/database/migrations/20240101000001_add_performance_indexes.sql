-- Migration: Add performance indexes
-- Version: 20240101000001
-- Description: Add additional indexes for common query patterns

-- Add composite indexes for better query performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_measurement_location_measured_pm25
ON measurement (location_id, measured_at DESC, pm25) 
WHERE pm25 IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_measurement_recent_with_pm25
ON measurement (measured_at DESC, pm25) 
WHERE measured_at >= NOW() - INTERVAL '24 hours' AND pm25 IS NOT NULL;

-- Partial indexes for non-null sensor readings
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_measurement_pm10_recent
ON measurement (pm10, measured_at DESC) 
WHERE pm10 IS NOT NULL AND measured_at >= NOW() - INTERVAL '7 days';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_measurement_temp_recent
ON measurement (atmp, measured_at DESC) 
WHERE atmp IS NOT NULL AND measured_at >= NOW() - INTERVAL '7 days';

-- Index for geographic queries on location
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_location_coordinate_sensor_type
ON location USING GIST (coordinate, sensor_type);

-- Index for data source filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_location_data_source_active
ON location (data_source, created_at DESC) 
WHERE deleted_at IS NULL;

-- Record migration
INSERT INTO schema_migrations (version) VALUES ('20240101000001_add_performance_indexes');