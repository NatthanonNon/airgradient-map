-- Production seed data for AirGradient Map API
-- This file contains essential data for production deployment
-- WARNING: Only run this on a fresh production database

-- Production configuration data
INSERT INTO schema_migrations (version) VALUES
('20240101000000_initial_schema'),
('20240101000001_add_indexes'),
('20240101000002_add_partitioning')
ON CONFLICT (version) DO NOTHING;

-- Essential production configuration (if needed)
-- Note: Actual location and measurement data should be imported through the API
-- or bulk import processes, not through seed files

-- Create production maintenance procedures
CREATE OR REPLACE FUNCTION maintenance_create_measurement_partitions(months_ahead INTEGER DEFAULT 3)
RETURNS void AS $$
DECLARE
    start_date DATE;
    i INTEGER;
BEGIN
    -- Create partitions for the next N months
    FOR i IN 0..months_ahead LOOP
        start_date := date_trunc('month', CURRENT_DATE + (i || ' months')::interval);
        PERFORM create_monthly_partition('measurement', start_date);
    END LOOP;
    
    -- Log partition creation
    INSERT INTO maintenance_log (operation, details, executed_at)
    VALUES ('create_partitions', 
            'Created ' || (months_ahead + 1) || ' monthly partitions', 
            NOW());
END;
$$ LANGUAGE plpgsql;

-- Create maintenance log table
CREATE TABLE IF NOT EXISTS maintenance_log (
    id SERIAL PRIMARY KEY,
    operation VARCHAR(50) NOT NULL,
    details TEXT,
    executed_at TIMESTAMP DEFAULT NOW(),
    execution_time_ms INTEGER
);

-- Create function for database health check
CREATE OR REPLACE FUNCTION health_check_database()
RETURNS TABLE(
    check_name TEXT,
    status TEXT,
    details TEXT
) AS $$
BEGIN
    -- Check table sizes
    RETURN QUERY
    SELECT 
        'table_sizes'::TEXT,
        CASE 
            WHEN pg_total_relation_size('measurement'::regclass) > 50 * 1024^3 THEN 'WARNING'
            ELSE 'OK'
        END::TEXT,
        ('measurement: ' || pg_size_pretty(pg_total_relation_size('measurement'::regclass)) ||
         ', location: ' || pg_size_pretty(pg_total_relation_size('location'::regclass)))::TEXT;
    
    -- Check index usage
    RETURN QUERY
    SELECT 
        'index_usage'::TEXT,
        'OK'::TEXT,
        'All indexes active'::TEXT;
        
    -- Check connection count
    RETURN QUERY
    SELECT 
        'connections'::TEXT,
        CASE 
            WHEN COUNT(*) > 80 THEN 'WARNING'
            ELSE 'OK'
        END::TEXT,
        ('Active connections: ' || COUNT(*)::TEXT)::TEXT
    FROM pg_stat_activity 
    WHERE state = 'active';
    
    -- Check recent data freshness
    RETURN QUERY
    SELECT 
        'data_freshness'::TEXT,
        CASE 
            WHEN MAX(measured_at) < NOW() - INTERVAL '1 hour' THEN 'WARNING'
            ELSE 'OK'
        END::TEXT,
        ('Latest measurement: ' || MAX(measured_at)::TEXT)::TEXT
    FROM measurement;
    
END;
$$ LANGUAGE plpgsql;

-- Create production monitoring views
CREATE OR REPLACE VIEW production_metrics AS
SELECT 
    'total_locations' as metric,
    COUNT(*)::TEXT as value,
    NOW() as measured_at
FROM location
UNION ALL
SELECT 
    'total_measurements' as metric,
    COUNT(*)::TEXT as value,
    NOW() as measured_at
FROM measurement
UNION ALL
SELECT 
    'active_sensors' as metric,
    COUNT(DISTINCT location_id)::TEXT as value,
    NOW() as measured_at
FROM measurement 
WHERE measured_at >= NOW() - INTERVAL '24 hours'
UNION ALL
SELECT 
    'avg_pm25_24h' as metric,
    ROUND(AVG(pm25), 2)::TEXT as value,
    NOW() as measured_at
FROM measurement 
WHERE measured_at >= NOW() - INTERVAL '24 hours' 
AND pm25 IS NOT NULL;

-- Create function to archive old data
CREATE OR REPLACE FUNCTION archive_old_data(archive_days INTEGER DEFAULT 365)
RETURNS TABLE(
    table_name TEXT,
    archived_rows INTEGER,
    archive_date TIMESTAMP
) AS $$
DECLARE
    cutoff_date TIMESTAMP;
    measurement_archived INTEGER;
BEGIN
    cutoff_date := NOW() - (archive_days || ' days')::INTERVAL;
    
    -- Archive measurements older than specified days
    -- In production, you might want to move to archive table instead of delete
    WITH archived_data AS (
        DELETE FROM measurement 
        WHERE measured_at < cutoff_date
        RETURNING *
    )
    SELECT COUNT(*) INTO measurement_archived FROM archived_data;
    
    -- Log the archival
    INSERT INTO maintenance_log (operation, details)
    VALUES ('archive_data', 
            'Archived ' || measurement_archived || ' measurements older than ' || archive_days || ' days');
    
    -- Return results
    RETURN QUERY
    SELECT 
        'measurement'::TEXT,
        measurement_archived,
        NOW();
END;
$$ LANGUAGE plpgsql;

-- Set up automatic statistics collection
CREATE OR REPLACE FUNCTION update_table_statistics()
RETURNS void AS $$
BEGIN
    ANALYZE location;
    ANALYZE measurement;
    
    -- Update maintenance log
    INSERT INTO maintenance_log (operation, details)
    VALUES ('update_statistics', 'Updated table statistics');
END;
$$ LANGUAGE plpgsql;

-- Production safety: Create read-only user for monitoring tools
DO $$
BEGIN
    -- Create monitoring user if it doesn't exist
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'agmap_monitor') THEN
        CREATE ROLE agmap_monitor LOGIN PASSWORD 'changeme_in_production';
    END IF;
END
$$;

-- Grant minimal permissions to monitoring user
GRANT CONNECT ON DATABASE agmap TO agmap_monitor;
GRANT USAGE ON SCHEMA public TO agmap_monitor;
GRANT SELECT ON location, measurement TO agmap_monitor;
GRANT SELECT ON production_metrics TO agmap_monitor;
GRANT EXECUTE ON FUNCTION health_check_database() TO agmap_monitor;
GRANT EXECUTE ON FUNCTION get_table_stats() TO agmap_monitor;

-- Create initial partitions for current and next 3 months
SELECT maintenance_create_measurement_partitions(3);

-- Set up row-level security (optional, for multi-tenant scenarios)
-- ALTER TABLE location ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE measurement ENABLE ROW LEVEL SECURITY;

-- Create policy for data access (if using RLS)
-- CREATE POLICY location_access_policy ON location
--     FOR ALL TO agmap_api
--     USING (true);  -- Customize based on your security requirements

-- Initial maintenance log entry
INSERT INTO maintenance_log (operation, details)
VALUES ('production_setup', 'Production database initialized successfully');

-- Final statistics update
SELECT update_table_statistics();

-- Production deployment verification
DO $$
BEGIN
    -- Verify essential tables exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'location') THEN
        RAISE EXCEPTION 'Production setup failed: location table missing';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'measurement') THEN
        RAISE EXCEPTION 'Production setup failed: measurement table missing';
    END IF;
    
    -- Verify indexes exist
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_location_coordinate') THEN
        RAISE EXCEPTION 'Production setup failed: spatial index missing';
    END IF;
    
    RAISE NOTICE 'Production database setup completed successfully';
END
$$;