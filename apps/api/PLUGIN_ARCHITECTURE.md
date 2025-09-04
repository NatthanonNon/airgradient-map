# 🔌 Plugin-Based Data Source Architecture

## ✨ **Dynamic Data Source Integration System**

This plugin-based architecture allows you to **dynamically add new air quality data sources** just by adding configuration files - no code changes required!

## 🎯 **Key Features**

✅ **Configuration-Driven**: Add new data sources with JSON config  
✅ **Dynamic Plugin Loading**: Automatically loads and registers plugins  
✅ **Cron Scheduling**: Each data source runs on its own schedule  
✅ **Health Monitoring**: Built-in health checks and statistics  
✅ **Error Handling**: Robust error handling with retry logic  
✅ **Management API**: REST endpoints for plugin management  
✅ **Validation System**: Comprehensive configuration validation  
✅ **Hot Reload**: Enable/disable data sources without restart  

## 🏗️ **Architecture Overview**

```
📁 src/datasources/
├── 🔌 interfaces/           # Plugin interfaces and contracts
├── 📋 registry/            # Plugin registry and factory
├── ⏰ scheduler/           # Cron job management
├── 🎛️  controllers/        # Management API endpoints
├── 🔧 plugins/            # Actual plugin implementations
└── ✅ validators/         # Configuration validation
```

## 🚀 **Quick Start: Adding DustBoy Data Source**

### **1. Create Configuration File**

```json
{
  "dataSources": [
    {
      "name": "dustboy-thailand",
      "type": "dustboy",
      "enabled": true,
      "cronSchedule": "0 */5 * * * *",
      "apiConfig": {
        "baseUrl": "https://api.dustboy.org",
        "apiKey": "your-api-key",
        "timeout": 30000,
        "retries": 3
      },
      "mapping": {
        "locationId": "station_id",
        "locationName": "station_name",
        "longitude": "longitude",
        "latitude": "latitude",
        "sensorType": "sensor_type",
        "pm25": "pm25_value",
        "pm10": "pm10_value",
        "atmp": "temperature",
        "rhum": "humidity",
        "measuredAt": "timestamp"
      }
    }
  ]
}
```

### **2. Add to Environment Configuration**

```typescript
// src/config/configuration.ts
export default () => ({
  // ... other config
  dataSources: JSON.parse(process.env.DATA_SOURCES_CONFIG || '{"dataSources": []}').dataSources,
});
```

### **3. Set Environment Variable**

```bash
export DATA_SOURCES_CONFIG='{"dataSources": [...]}'
```

**That's it!** 🎉 The system will:
- Automatically load the DustBoy plugin
- Schedule it to run every 5 minutes
- Start fetching and transforming data
- Store results in the database

## 📊 **Plugin Types Available**

### **1. DustBoy Plugin** 🇹🇭
- **Network**: Thailand air quality monitoring
- **Measurements**: PM2.5, PM10, Temperature, Humidity
- **Features**: UTM coordinate transformation, online status filtering

### **2. AirGradient Plugin** 🌍
- **Network**: Official AirGradient sensor network  
- **Measurements**: PM2.5, PM10, Temperature, Humidity, CO2
- **Features**: EPA PM2.5 correction, public sensor filtering

### **3. PurpleAir Plugin** 💜
- **Network**: Global PurpleAir sensor network
- **Measurements**: PM2.5, PM10, Temperature, Humidity
- **Features**: Private sensor filtering, location type validation

### **4. OpenAQ Plugin** 🌐
- **Network**: Global open air quality data
- **Measurements**: PM2.5, PM10, O3, NO2
- **Features**: Country filtering, multi-pollutant support

### **5. Generic Plugin** ⚙️
- **Purpose**: Any REST API following standard patterns
- **Features**: Flexible response parsing, custom endpoints
- **Use Case**: Custom APIs, one-off integrations

## 🛠️ **Management API Endpoints**

### **Get All Data Sources**
```http
GET /admin/datasources
```

### **Create New Data Source**
```http
POST /admin/datasources
Content-Type: application/json

{
  "name": "my-new-source",
  "type": "generic",
  "enabled": true,
  "cronSchedule": "0 */10 * * * *",
  "apiConfig": { ... },
  "mapping": { ... }
}
```

### **Enable/Disable Data Source**
```http
POST /admin/datasources/{name}/enable
POST /admin/datasources/{name}/disable
```

### **Trigger Manual Run**
```http
POST /admin/datasources/{name}/trigger
```

### **Health Check**
```http
GET /admin/datasources/{name}/health
```

### **Statistics**
```http
GET /admin/datasources/{name}/stats
```

## 📝 **Configuration Reference**

### **Complete Configuration Schema**

```typescript
interface DataSourceConfig {
  name: string;                    // Unique identifier
  enabled: boolean;               // Enable/disable data source
  cronSchedule: string;           // Cron expression (6 parts)
  
  apiConfig: {
    baseUrl: string;              // API base URL
    apiKey?: string;              // API authentication key
    endpoint?: string;            // Custom endpoint path
    healthEndpoint?: string;      // Health check endpoint
    headers?: Record<string, string>; // Custom headers
    timeout?: number;             // Request timeout (ms)
    retries?: number;             // Retry attempts
  };
  
  mapping: {
    locationId: string;           // Location identifier field
    locationName: string;         // Location name field
    longitude: string;            // Longitude coordinate field
    latitude: string;             // Latitude coordinate field
    sensorType: string;           // Sensor type field
    pm25?: string;               // PM2.5 measurement field
    pm10?: string;               // PM10 measurement field
    atmp?: string;               // Temperature field
    rhum?: string;               // Humidity field
    rco2?: string;               // CO2 field
    o3?: string;                 // Ozone field
    no2?: string;                // NO2 field
    measuredAt: string;          // Timestamp field
  };
  
  transformation?: {
    coordinates?: 'transform' | 'direct';  // Coordinate transformation
    dateFormat?: string;                   // Date parsing format
    valueMultipliers?: Record<string, number>; // Value multipliers
    filters?: Record<string, any>;         // Filter conditions
  };
}
```

### **Cron Schedule Examples**

```bash
"0 */5 * * * *"     # Every 5 minutes
"0 0 */1 * * *"     # Every hour
"0 15 */2 * * *"    # Every 2 hours at 15 minutes past
"0 0 6,18 * * *"    # Daily at 6 AM and 6 PM
"0 0 0 * * 1"       # Weekly on Mondays at midnight
```

### **Field Mapping Examples**

```json
{
  "mapping": {
    "locationId": "id",                    // Direct field
    "locationName": "station.name",        // Nested field
    "longitude": "coordinates[0]",         // Array index
    "pm25": "measurements.pm25.value",     // Deep nested
    "measuredAt": "timestamp"              // ISO string
  }
}
```

### **Transformation Examples**

```json
{
  "transformation": {
    "valueMultipliers": {
      "atmp": 1.0,        // Keep as-is
      "o3": 1.96,         // Convert ppb to µg/m³
      "no2": 1.88         // Convert ppb to µg/m³
    },
    "filters": {
      "status": "online",     // Only online sensors
      "public": true,         // Only public sensors
      "quality": "valid"      // Only valid data
    }
  }
}
```

## 🔍 **Monitoring & Statistics**

Each data source provides detailed statistics:

```json
{
  "name": "dustboy-thailand",
  "enabled": true,
  "cronSchedule": "0 */5 * * * *",
  "lastRun": "2024-01-01T12:05:00Z",
  "lastSuccess": "2024-01-01T12:05:00Z",
  "totalRuns": 144,
  "successfulRuns": 142,
  "failedRuns": 2,
  "averageRecords": 85,
  "averageRunTime": 2340
}
```

## ⚡ **Performance Features**

### **Smart Scheduling**
- Individual cron schedules per data source
- Automatic retry with exponential backoff
- Health checks before data processing
- Graceful error handling

### **Efficient Data Processing**
- Streaming data transformation
- Bulk database operations with transactions
- Duplicate detection and handling
- Memory-efficient processing for large datasets

### **Monitoring & Alerting**
- Real-time health status monitoring
- Performance metrics collection
- Error rate tracking
- Automatic plugin disable on repeated failures

## 🛡️ **Security & Validation**

### **Configuration Validation**
- Schema validation for all configurations
- API endpoint reachability checks
- Field mapping validation
- Cron schedule syntax validation

### **Runtime Security**
- API key encryption in configuration
- Request timeout enforcement
- Rate limiting for external API calls
- SQL injection prevention in data storage

### **Error Handling**
- Centralized error management
- Detailed error logging with correlation IDs
- Automatic recovery mechanisms
- Failed request tracking

## 🔧 **Custom Plugin Development**

### **Creating a New Plugin**

1. **Extend Base Plugin Class**
```typescript
import { BaseDataSourcePlugin } from '../base.plugin';

export class MyCustomPlugin extends BaseDataSourcePlugin {
  get name(): string {
    return this.config.name;
  }

  getMetadata() {
    return {
      description: 'My custom air quality data source',
      version: '1.0.0',
      supportedMeasurements: ['pm25', 'pm10'],
      expectedUpdateFrequency: '10 minutes',
    };
  }

  protected getDataEndpoint(): string {
    return '/api/measurements';
  }
}
```

2. **Register Plugin Type**
```typescript
// In datasource.registry.ts
const pluginMap = {
  'my-custom': () => import('../plugins/my-custom.plugin').then(m => m.MyCustomPlugin),
  // ... other plugins
};
```

3. **Use in Configuration**
```json
{
  "name": "my-data-source",
  "type": "my-custom",
  "enabled": true,
  // ... rest of config
}
```

## 🚀 **Deployment**

### **Docker Environment Variables**
```bash
# Data source configuration
DATA_SOURCES_CONFIG='{"dataSources": [...]}'

# Database connection
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_NAME=agmap
```

### **Kubernetes ConfigMap**
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: datasources-config
data:
  datasources.json: |
    {
      "dataSources": [...]
    }
```

## 📊 **Example: Complete DustBoy Integration**

```json
{
  "dataSources": [
    {
      "name": "dustboy-bangkok",
      "type": "dustboy",
      "enabled": true,
      "cronSchedule": "0 */5 * * * *",
      "apiConfig": {
        "baseUrl": "https://api.dustboy.org",
        "apiKey": "your-dustboy-api-key",
        "timeout": 30000,
        "retries": 3,
        "headers": {
          "Accept": "application/json",
          "User-Agent": "AirGradient-Map-API/1.0"
        }
      },
      "mapping": {
        "locationId": "station_id",
        "locationName": "station_name",
        "longitude": "longitude",
        "latitude": "latitude",
        "sensorType": "sensor_type",
        "pm25": "pm25_value",
        "pm10": "pm10_value",
        "atmp": "temperature",
        "rhum": "humidity",
        "measuredAt": "timestamp"
      },
      "transformation": {
        "coordinates": "direct",
        "dateFormat": "iso8601",
        "valueMultipliers": {
          "atmp": 1.0,
          "rhum": 1.0
        },
        "filters": {
          "online": true,
          "status": "active"
        }
      }
    }
  ]
}
```

**Result**: DustBoy sensors automatically integrated, running every 5 minutes, with health monitoring and error handling! 🎉

## 🎯 **Benefits**

- **⚡ Zero Downtime**: Add data sources without restart
- **🔧 No Code Changes**: Pure configuration-driven
- **📊 Full Monitoring**: Health checks, statistics, error tracking  
- **🛡️ Robust**: Retry logic, validation, error handling
- **⚖️ Scalable**: Add unlimited data sources
- **🎛️ Manageable**: REST API for all operations

This architecture transforms the data integration process from **manual coding** to **configuration management**, making the system infinitely extensible! 🚀