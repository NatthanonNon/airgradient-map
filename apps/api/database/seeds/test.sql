-- Test seed data for AirGradient Map API
-- This file contains minimal data for unit and integration tests

-- Test locations with predictable data
INSERT INTO location (id, owner_id, reference_id, sensor_type, location_name, timezone, coordinate, data_source, provider) VALUES
(1, 1, 2001, 'Small Sensor', 'Test Location 1', 'UTC', ST_Transform(ST_GeomFromText('POINT(-122.4194 37.7749)', 4326), 3857), 'AirGradient', 'Test'),
(2, 1, 2002, 'Small Sensor', 'Test Location 2', 'UTC', ST_Transform(ST_GeomFromText('POINT(-73.9682 40.7831)', 4326), 3857), 'AirGradient', 'Test'),
(3, 2, 2003, 'Reference', 'Test Reference Station', 'UTC', ST_Transform(ST_GeomFromText('POINT(-118.2437 34.0522)', 4326), 3857), 'OpenAQ', 'Test'),
(4, 2, 2004, 'Small Sensor', 'Test Location 4', 'UTC', ST_Transform(ST_GeomFromText('POINT(0 0)', 4326), 3857), 'AirGradient', 'Test'),
(5, 3, 2005, 'Small Sensor', 'Edge Case Location', 'UTC', ST_Transform(ST_GeomFromText('POINT(-180 -90)', 4326), 3857), 'AirGradient', 'Test')
ON CONFLICT (id) DO UPDATE SET
    location_name = EXCLUDED.location_name,
    coordinate = EXCLUDED.coordinate,
    data_source = EXCLUDED.data_source;

-- Test measurements with known values for testing
INSERT INTO measurement (location_id, pm25, pm10, atmp, rhum, rco2, o3, no2, measured_at) VALUES
-- Recent measurements (within last 6 hours)
(1, 25.5, 35.2, 22.1, 65, 450, 35, 25, NOW() - INTERVAL '1 hour'),
(1, 26.1, 36.0, 22.3, 64, 455, 36, 26, NOW() - INTERVAL '2 hours'),
(2, 15.2, 22.8, 20.5, 55, 420, 28, 18, NOW() - INTERVAL '30 minutes'),
(2, 16.0, 23.5, 20.8, 56, 425, 29, 19, NOW() - INTERVAL '1.5 hours'),
(3, 45.8, 65.2, 25.2, 70, 500, 45, 35, NOW() - INTERVAL '45 minutes'),
(3, 44.2, 63.8, 25.0, 69, 495, 44, 34, NOW() - INTERVAL '2.5 hours'),

-- Boundary test values
(4, 0.0, 0.0, -10.0, 0, 350, 0, 0, NOW() - INTERVAL '15 minutes'),
(4, 500.0, 999.9, 50.0, 100, 5000, 200, 200, NOW() - INTERVAL '3 hours'),

-- NULL value tests
(5, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NOW() - INTERVAL '20 minutes'),
(5, 30.0, NULL, 25.0, NULL, 600, NULL, 40, NOW() - INTERVAL '4 hours'),

-- Old measurements (beyond 6 hours - should not appear in "current" queries)
(1, 100.0, 150.0, 30.0, 80, 800, 60, 50, NOW() - INTERVAL '8 hours'),
(2, 200.0, 250.0, 35.0, 85, 900, 70, 60, NOW() - INTERVAL '12 hours'),

-- Very recent measurement (should be the "latest" for location 1)
(1, 24.8, 34.5, 21.8, 63, 448, 34, 24, NOW() - INTERVAL '5 minutes')
ON CONFLICT DO NOTHING;

-- Test data for edge cases and validation
INSERT INTO measurement (location_id, pm25, pm10, atmp, rhum, rco2, o3, no2, measured_at) VALUES
-- Extreme values for validation testing
(1, -1.0, -1.0, -50.0, -1, -100, -10, -10, NOW() - INTERVAL '10 minutes'), -- Invalid negative values
(2, 1000.0, 2000.0, 100.0, 200, 10000, 500, 500, NOW() - INTERVAL '15 minutes'), -- Invalid high values
(3, 0.1, 0.1, 0.1, 1, 300, 1, 1, NOW() - INTERVAL '25 minutes') -- Valid minimal values
ON CONFLICT DO NOTHING;

-- Test API keys
INSERT INTO api_keys (key_hash, name, owner, rate_limit) VALUES
('test_key_123', 'Test API Key 1', 'test@example.com', 100),
('test_key_456', 'Test API Key 2', 'test2@example.com', 50),
('expired_key_789', 'Expired Test Key', 'expired@example.com', 10)
ON CONFLICT (key_hash) DO UPDATE SET name = EXCLUDED.name;

-- Set expiration for the expired key
UPDATE api_keys SET expires_at = NOW() - INTERVAL '1 day' WHERE key_hash = 'expired_key_789';

-- Reset sequences for consistent testing
SELECT setval('location_id_seq', 5, true);

-- Create test helper functions
CREATE OR REPLACE FUNCTION reset_test_data()
RETURNS void AS $$
BEGIN
    DELETE FROM measurement WHERE location_id IN (SELECT id FROM location WHERE provider = 'Test');
    DELETE FROM location WHERE provider = 'Test';
    
    -- Re-insert test data
    INSERT INTO location (id, owner_id, reference_id, sensor_type, location_name, timezone, coordinate, data_source, provider) VALUES
    (1, 1, 2001, 'Small Sensor', 'Test Location 1', 'UTC', ST_Transform(ST_GeomFromText('POINT(-122.4194 37.7749)', 4326), 3857), 'AirGradient', 'Test'),
    (2, 1, 2002, 'Small Sensor', 'Test Location 2', 'UTC', ST_Transform(ST_GeomFromText('POINT(-73.9682 40.7831)', 4326), 3857), 'AirGradient', 'Test'),
    (3, 2, 2003, 'Reference', 'Test Reference Station', 'UTC', ST_Transform(ST_GeomFromText('POINT(-118.2437 34.0522)', 4326), 3857), 'OpenAQ', 'Test'),
    (4, 2, 2004, 'Small Sensor', 'Test Location 4', 'UTC', ST_Transform(ST_GeomFromText('POINT(0 0)', 4326), 3857), 'AirGradient', 'Test'),
    (5, 3, 2005, 'Small Sensor', 'Edge Case Location', 'UTC', ST_Transform(ST_GeomFromText('POINT(-180 -90)', 4326), 3857), 'AirGradient', 'Test')
    ON CONFLICT (id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Create function to get test measurement count
CREATE OR REPLACE FUNCTION get_test_measurement_count()
RETURNS integer AS $$
BEGIN
    RETURN (SELECT COUNT(*) FROM measurement m 
            JOIN location l ON m.location_id = l.id 
            WHERE l.provider = 'Test');
END;
$$ LANGUAGE plpgsql;

-- Analyze for better test query performance
ANALYZE location;
ANALYZE measurement;