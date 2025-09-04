-- AirGradient Map API Database Schema
-- This file contains the database schema without any data
-- Run this to initialize a fresh database

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Set up search path
SET search_path TO public, topology;

-- Custom types
CREATE TYPE sensor_type_enum AS ENUM (
    'Small Sensor',
    'Reference'
);

-- Location table
CREATE TABLE IF NOT EXISTS location (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL,
    reference_id INTEGER NOT NULL,
    sensor_type sensor_type_enum NOT NULL,
    location_name VARCHAR(255),
    timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
    coordinate GEOMETRY(Point, 3857) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP WITHOUT TIME ZONE NULL,
    licenses VARCHAR(100)[],
    data_source VARCHAR(100) DEFAULT 'AirGradient' NOT NULL,
    provider VARCHAR(100)
);

-- Measurement table (partitioned by time)
CREATE TABLE IF NOT EXISTS measurement (
    location_id INTEGER NOT NULL,
    pm25 DOUBLE PRECISION,
    pm10 DOUBLE PRECISION,
    atmp DOUBLE PRECISION,
    rhum DOUBLE PRECISION,
    rco2 INTEGER,
    o3 INTEGER,
    no2 INTEGER,
    measured_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL
) PARTITION BY RANGE (measured_at);

-- Create default partition for measurement table
CREATE TABLE IF NOT EXISTS measurement_default PARTITION OF measurement DEFAULT;

-- Indexes for performance
-- Location indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_location_coordinate 
ON location USING GIST (coordinate);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_location_sensor_type 
ON location (sensor_type);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_location_data_source 
ON location (data_source);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_location_created_at 
ON location (created_at DESC);

-- Measurement indexes (will be inherited by partitions)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_measurement_location_id 
ON measurement (location_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_measurement_measured_at 
ON measurement (measured_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_measurement_pm25 
ON measurement (pm25) WHERE pm25 IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_measurement_location_measured 
ON measurement (location_id, measured_at DESC);

-- Constraints
ALTER TABLE measurement ADD CONSTRAINT fk_measurement_location 
    FOREIGN KEY (location_id) REFERENCES location(id) ON DELETE CASCADE;

-- Triggers for automatic partitioning (optional - can use pg_partman)
CREATE OR REPLACE FUNCTION create_monthly_partition(table_name text, start_date date)
RETURNS void AS $$
DECLARE
    partition_name text;
    start_month text;
    end_date date;
BEGIN
    start_month := to_char(start_date, 'YYYYMM');
    partition_name := table_name || '_' || start_month;
    end_date := start_date + interval '1 month';
    
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF %I
                    FOR VALUES FROM (%L) TO (%L)',
                    partition_name, table_name, start_date, end_date);
                    
    -- Add indexes to the partition
    EXECUTE format('CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_%s_location_id 
                    ON %I (location_id)', start_month, partition_name);
    EXECUTE format('CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_%s_measured_at 
                    ON %I (measured_at DESC)', start_month, partition_name);
END;
$$ LANGUAGE plpgsql;

-- Create some initial partitions (current month and next few months)
SELECT create_monthly_partition('measurement', date_trunc('month', CURRENT_DATE));
SELECT create_monthly_partition('measurement', date_trunc('month', CURRENT_DATE + interval '1 month'));
SELECT create_monthly_partition('measurement', date_trunc('month', CURRENT_DATE + interval '2 months'));

-- Views for common queries
CREATE OR REPLACE VIEW latest_measurements AS
SELECT 
    l.id as location_id,
    l.location_name,
    ST_X(l.coordinate) as longitude,
    ST_Y(l.coordinate) as latitude,
    l.sensor_type,
    l.data_source,
    m.pm25,
    m.pm10,
    m.atmp,
    m.rhum,
    m.rco2,
    m.o3,
    m.no2,
    m.measured_at,
    m.created_at
FROM location l
JOIN measurement m ON l.id = m.location_id
WHERE m.measured_at >= NOW() - INTERVAL '6 hours'
AND m.measured_at = (
    SELECT MAX(m2.measured_at) 
    FROM measurement m2 
    WHERE m2.location_id = l.id 
    AND m2.measured_at >= NOW() - INTERVAL '6 hours'
);

-- Performance monitoring function
CREATE OR REPLACE FUNCTION get_table_stats()
RETURNS TABLE(
    table_name text,
    row_count bigint,
    table_size text,
    index_size text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.table_name::text,
        (SELECT COUNT(*) FROM location)::bigint as row_count,
        pg_size_pretty(pg_total_relation_size('location'::regclass))::text as table_size,
        pg_size_pretty(pg_indexes_size('location'::regclass))::text as index_size
    FROM (SELECT 'location' as table_name) t
    UNION ALL
    SELECT 
        'measurement'::text,
        (SELECT COUNT(*) FROM measurement)::bigint,
        pg_size_pretty(pg_total_relation_size('measurement'::regclass))::text,
        pg_size_pretty(pg_indexes_size('measurement'::regclass))::text;
END;
$$ LANGUAGE plpgsql;

-- Function to clean old measurement data
CREATE OR REPLACE FUNCTION cleanup_old_measurements(days_to_keep integer DEFAULT 90)
RETURNS integer AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM measurement 
    WHERE measured_at < NOW() - (days_to_keep || ' days')::interval;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log the cleanup
    INSERT INTO cleanup_log (table_name, deleted_rows, cleanup_date)
    VALUES ('measurement', deleted_count, NOW());
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Cleanup log table
CREATE TABLE IF NOT EXISTS cleanup_log (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    deleted_rows INTEGER NOT NULL,
    cleanup_date TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Database version tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(14) PRIMARY KEY,
    applied_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Insert initial migration
INSERT INTO schema_migrations (version) VALUES ('20240101000000_initial_schema')
ON CONFLICT (version) DO NOTHING;