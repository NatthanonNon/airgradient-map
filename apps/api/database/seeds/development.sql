-- Development seed data for AirGradient Map API
-- This file contains sample data for development and testing

-- Development locations (sample data)
INSERT INTO location (owner_id, reference_id, sensor_type, location_name, timezone, coordinate, data_source, provider) VALUES
(1, 1001, 'Small Sensor', 'San Francisco - Mission', 'America/Los_Angeles', ST_Transform(ST_GeomFromText('POINT(-122.4194 37.7749)', 4326), 3857), 'AirGradient', 'Community'),
(1, 1002, 'Small Sensor', 'New York - Central Park', 'America/New_York', ST_Transform(ST_GeomFromText('POINT(-73.9682 40.7831)', 4326), 3857), 'AirGradient', 'Community'),
(1, 1003, 'Reference', 'Los Angeles - Downtown', 'America/Los_Angeles', ST_Transform(ST_GeomFromText('POINT(-118.2437 34.0522)', 4326), 3857), 'OpenAQ', 'Government'),
(2, 1004, 'Small Sensor', 'Seattle - Capitol Hill', 'America/Los_Angeles', ST_Transform(ST_GeomFromText('POINT(-122.3201 47.6062)', 4326), 3857), 'AirGradient', 'Community'),
(2, 1005, 'Small Sensor', 'Chicago - Lincoln Park', 'America/Chicago', ST_Transform(ST_GeomFromText('POINT(-87.6298 41.8781)', 4326), 3857), 'AirGradient', 'Community'),
(3, 1006, 'Reference', 'Miami - South Beach', 'America/New_York', ST_Transform(ST_GeomFromText('POINT(-80.1918 25.7617)', 4326), 3857), 'OpenAQ', 'Research'),
(3, 1007, 'Small Sensor', 'Denver - RiNo', 'America/Denver', ST_Transform(ST_GeomFromText('POINT(-104.9903 39.7392)', 4326), 3857), 'AirGradient', 'Community'),
(4, 1008, 'Small Sensor', 'Portland - Pearl District', 'America/Los_Angeles', ST_Transform(ST_GeomFromText('POINT(-122.6784 45.5152)', 4326), 3857), 'AirGradient', 'Community'),
(4, 1009, 'Reference', 'Austin - Downtown', 'America/Chicago', ST_Transform(ST_GeomFromText('POINT(-97.7431 30.2672)', 4326), 3857), 'OpenAQ', 'Government'),
(5, 1010, 'Small Sensor', 'Boston - Back Bay', 'America/New_York', ST_Transform(ST_GeomFromText('POINT(-71.0589 42.3601)', 4326), 3857), 'AirGradient', 'Community')
ON CONFLICT (id) DO NOTHING;

-- Sample measurements for the last 24 hours
WITH location_ids AS (
    SELECT id FROM location LIMIT 10
),
time_series AS (
    SELECT generate_series(
        NOW() - INTERVAL '24 hours',
        NOW(),
        INTERVAL '15 minutes'
    ) AS ts
)
INSERT INTO measurement (location_id, pm25, pm10, atmp, rhum, rco2, o3, no2, measured_at)
SELECT 
    l.id,
    -- Generate realistic air quality data with some variation
    CASE 
        WHEN random() > 0.8 THEN NULL -- 20% chance of null values
        ELSE (15 + random() * 50)::numeric(5,2) -- PM2.5: 15-65 µg/m³
    END as pm25,
    CASE 
        WHEN random() > 0.9 THEN NULL
        ELSE (20 + random() * 80)::numeric(5,2) -- PM10: 20-100 µg/m³
    END as pm10,
    CASE 
        WHEN random() > 0.85 THEN NULL
        ELSE (18 + random() * 15)::numeric(4,2) -- Temperature: 18-33°C
    END as atmp,
    CASE 
        WHEN random() > 0.85 THEN NULL
        ELSE (35 + random() * 50)::integer -- Humidity: 35-85%
    END as rhum,
    CASE 
        WHEN random() > 0.7 THEN NULL
        ELSE (400 + random() * 800)::integer -- CO2: 400-1200 ppm
    END as rco2,
    CASE 
        WHEN random() > 0.9 THEN NULL
        ELSE (20 + random() * 60)::integer -- O3: 20-80 µg/m³
    END as o3,
    CASE 
        WHEN random() > 0.9 THEN NULL
        ELSE (10 + random() * 40)::integer -- NO2: 10-50 µg/m³
    END as no2,
    ts.ts
FROM location_ids l
CROSS JOIN time_series ts
WHERE random() > 0.1 -- Skip 10% of measurements to simulate missing data
ON CONFLICT DO NOTHING;

-- Add some high pollution events for testing alerts
INSERT INTO measurement (location_id, pm25, pm10, atmp, rhum, rco2, measured_at)
SELECT 
    id,
    150 + random() * 100, -- Very high PM2.5
    200 + random() * 150, -- Very high PM10
    25 + random() * 5,
    60 + random() * 20,
    800 + random() * 400,
    NOW() - INTERVAL '2 hours'
FROM location 
WHERE sensor_type = 'Small Sensor'
LIMIT 2
ON CONFLICT DO NOTHING;

-- Create some test API keys (if you implement API key auth)
CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    key_hash VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    owner VARCHAR(100),
    rate_limit INTEGER DEFAULT 100,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Sample API keys for development (these are test keys only)
INSERT INTO api_keys (key_hash, name, owner, rate_limit) VALUES
('dev_key_hash_123', 'Development API Key', 'developer@airgradient.com', 1000),
('test_key_hash_456', 'Test API Key', 'tester@airgradient.com', 500)
ON CONFLICT (key_hash) DO NOTHING;

-- Update sequence values to avoid conflicts
SELECT setval('location_id_seq', (SELECT MAX(id) FROM location) + 1, false);

-- Analyze tables for better query planning
ANALYZE location;
ANALYZE measurement;