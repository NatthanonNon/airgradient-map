import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Param, 
  Body, 
  HttpStatus, 
  HttpCode,
  UseGuards,
  Query 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { DataSourceRegistryService } from '../registry/datasource.registry';
import { DataSourceScheduler, DataSourceJobStats } from '../scheduler/datasource.scheduler';
import { DataSourceConfig } from '../interfaces/datasource-plugin.interface';
import { AppError, ErrorCode } from '../../common/errors';

class CreateDataSourceDto {
  name: string;
  type: string;
  enabled: boolean;
  cronSchedule: string;
  apiConfig: {
    baseUrl: string;
    apiKey?: string;
    headers?: Record<string, string>;
    timeout?: number;
    retries?: number;
  };
  mapping: {
    locationId: string;
    locationName: string;
    longitude: string;
    latitude: string;
    sensorType: string;
    pm25?: string;
    pm10?: string;
    atmp?: string;
    rhum?: string;
    rco2?: string;
    o3?: string;
    no2?: string;
    measuredAt: string;
  };
  transformation?: {
    coordinates?: 'transform' | 'direct';
    dateFormat?: string;
    valueMultipliers?: Record<string, number>;
    filters?: Record<string, any>;
  };
}

class UpdateDataSourceDto extends CreateDataSourceDto {}

class TriggerRunDto {
  force?: boolean;
}

@Controller('admin/datasources')
@ApiTags('Data Source Management')
// @UseGuards(AdminAuthGuard) // Implement admin authentication
export class DataSourceController {
  constructor(
    private readonly registry: DataSourceRegistryService,
    private readonly scheduler: DataSourceScheduler,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all data sources' })
  @ApiResponse({ status: 200, description: 'List of all data sources with status' })
  async getAllDataSources() {
    const plugins = this.registry.getAll();
    const status = await this.scheduler.getDataSourceStatus();
    
    return {
      total: plugins.length,
      enabled: status.enabled,
      running: status.running,
      failed: status.failed,
      dataSources: plugins.map(plugin => {
        const stats = status.stats.find(s => s.name === plugin.name);
        return {
          name: plugin.name,
          enabled: this.registry.getEnabled().includes(plugin),
          metadata: plugin.getMetadata(),
          config: {
            cronSchedule: plugin.config.cronSchedule,
            baseUrl: plugin.config.apiConfig.baseUrl,
            type: this.getPluginType(plugin),
          },
          stats: stats || null,
        };
      }),
    };
  }

  @Get(':name')
  @ApiOperation({ summary: 'Get specific data source details' })
  @ApiParam({ name: 'name', description: 'Data source name' })
  @ApiResponse({ status: 200, description: 'Data source details' })
  @ApiResponse({ status: 404, description: 'Data source not found' })
  async getDataSource(@Param('name') name: string) {
    const plugin = this.registry.get(name);
    if (!plugin) {
      throw AppError.businessError(ErrorCode.BIZ_001, 'getDataSource', { name });
    }

    const stats = this.scheduler.getJobStats(name) as DataSourceJobStats;
    const isEnabled = this.registry.getEnabled().includes(plugin);

    return {
      name: plugin.name,
      enabled: isEnabled,
      metadata: plugin.getMetadata(),
      config: plugin.config,
      stats: stats || null,
      type: this.getPluginType(plugin),
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create new data source' })
  @ApiBody({ type: CreateDataSourceDto })
  @ApiResponse({ status: 201, description: 'Data source created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid configuration' })
  @HttpCode(HttpStatus.CREATED)
  async createDataSource(@Body() dto: CreateDataSourceDto) {
    // Validate configuration
    if (this.registry.get(dto.name)) {
      throw AppError.businessError(
        ErrorCode.BIZ_002, 
        'createDataSource', 
        { name: dto.name, reason: 'Data source already exists' }
      );
    }

    try {
      // Create plugin configuration
      const config: DataSourceConfig = {
        name: dto.name,
        enabled: dto.enabled,
        cronSchedule: dto.cronSchedule,
        apiConfig: dto.apiConfig,
        mapping: dto.mapping,
        transformation: dto.transformation,
      };

      // Dynamically load and create plugin
      const PluginClass = await this.getPluginClass(dto.type);
      const plugin = new PluginClass(config);

      // Validate configuration
      const isValid = await plugin.validateConfig();
      if (!isValid) {
        throw AppError.validationError(
          ErrorCode.VAL_001,
          'configuration',
          config
        );
      }

      // Register plugin
      this.registry.register(plugin);

      // Schedule if enabled
      if (dto.enabled) {
        await this.registry.enablePlugin(dto.name);
        await this.scheduler.schedulePlugin(plugin);
      }

      return {
        message: 'Data source created successfully',
        name: dto.name,
        enabled: dto.enabled,
      };

    } catch (error) {
      throw AppError.businessError(
        ErrorCode.BIZ_003,
        'createDataSource',
        error,
        { name: dto.name }
      );
    }
  }

  @Put(':name')
  @ApiOperation({ summary: 'Update data source configuration' })
  @ApiParam({ name: 'name', description: 'Data source name' })
  @ApiBody({ type: UpdateDataSourceDto })
  @ApiResponse({ status: 200, description: 'Data source updated successfully' })
  @ApiResponse({ status: 404, description: 'Data source not found' })
  async updateDataSource(
    @Param('name') name: string,
    @Body() dto: UpdateDataSourceDto
  ) {
    const existingPlugin = this.registry.get(name);
    if (!existingPlugin) {
      throw AppError.businessError(ErrorCode.BIZ_001, 'updateDataSource', { name });
    }

    try {
      // Unschedule current plugin
      await this.scheduler.unschedulePlugin(name);
      
      // Create new configuration
      const config: DataSourceConfig = {
        name: dto.name,
        enabled: dto.enabled,
        cronSchedule: dto.cronSchedule,
        apiConfig: dto.apiConfig,
        mapping: dto.mapping,
        transformation: dto.transformation,
      };

      // Create new plugin instance
      const PluginClass = await this.getPluginClass(dto.type);
      const plugin = new PluginClass(config);

      // Validate new configuration
      const isValid = await plugin.validateConfig();
      if (!isValid) {
        throw AppError.validationError(ErrorCode.VAL_001, 'configuration', config);
      }

      // Replace plugin in registry
      this.registry.unregister(name);
      this.registry.register(plugin);

      // Reschedule if enabled
      if (dto.enabled) {
        await this.registry.enablePlugin(dto.name);
        await this.scheduler.schedulePlugin(plugin);
      }

      return {
        message: 'Data source updated successfully',
        name: dto.name,
        enabled: dto.enabled,
      };

    } catch (error) {
      // Try to restore original plugin on error
      try {
        if (existingPlugin.config.enabled) {
          await this.scheduler.schedulePlugin(existingPlugin);
        }
      } catch (restoreError) {
        // Log but don't throw
        console.error('Failed to restore original plugin:', restoreError);
      }

      throw AppError.businessError(
        ErrorCode.BIZ_003,
        'updateDataSource',
        error,
        { name }
      );
    }
  }

  @Delete(':name')
  @ApiOperation({ summary: 'Delete data source' })
  @ApiParam({ name: 'name', description: 'Data source name' })
  @ApiResponse({ status: 200, description: 'Data source deleted successfully' })
  @ApiResponse({ status: 404, description: 'Data source not found' })
  async deleteDataSource(@Param('name') name: string) {
    const plugin = this.registry.get(name);
    if (!plugin) {
      throw AppError.businessError(ErrorCode.BIZ_001, 'deleteDataSource', { name });
    }

    try {
      // Unschedule and unregister
      await this.scheduler.unschedulePlugin(name);
      this.registry.unregister(name);

      return {
        message: 'Data source deleted successfully',
        name,
      };

    } catch (error) {
      throw AppError.businessError(
        ErrorCode.BIZ_003,
        'deleteDataSource',
        error,
        { name }
      );
    }
  }

  @Post(':name/enable')
  @ApiOperation({ summary: 'Enable data source' })
  @ApiParam({ name: 'name', description: 'Data source name' })
  @ApiResponse({ status: 200, description: 'Data source enabled successfully' })
  async enableDataSource(@Param('name') name: string) {
    try {
      await this.scheduler.enableDataSource(name);
      return {
        message: 'Data source enabled successfully',
        name,
      };
    } catch (error) {
      throw AppError.businessError(
        ErrorCode.BIZ_003,
        'enableDataSource',
        error,
        { name }
      );
    }
  }

  @Post(':name/disable')
  @ApiOperation({ summary: 'Disable data source' })
  @ApiParam({ name: 'name', description: 'Data source name' })
  @ApiResponse({ status: 200, description: 'Data source disabled successfully' })
  async disableDataSource(@Param('name') name: string) {
    try {
      await this.scheduler.disableDataSource(name);
      return {
        message: 'Data source disabled successfully',
        name,
      };
    } catch (error) {
      throw AppError.businessError(
        ErrorCode.BIZ_003,
        'disableDataSource',
        error,
        { name }
      );
    }
  }

  @Post(':name/trigger')
  @ApiOperation({ summary: 'Trigger manual data source run' })
  @ApiParam({ name: 'name', description: 'Data source name' })
  @ApiBody({ type: TriggerRunDto, required: false })
  @ApiResponse({ status: 200, description: 'Manual run triggered successfully' })
  async triggerManualRun(
    @Param('name') name: string,
    @Body() dto: TriggerRunDto = {}
  ) {
    try {
      await this.scheduler.triggerManualRun(name);
      return {
        message: 'Manual run triggered successfully',
        name,
        triggeredAt: new Date(),
      };
    } catch (error) {
      throw AppError.businessError(
        ErrorCode.BIZ_003,
        'triggerManualRun',
        error,
        { name }
      );
    }
  }

  @Get(':name/health')
  @ApiOperation({ summary: 'Check data source health' })
  @ApiParam({ name: 'name', description: 'Data source name' })
  @ApiResponse({ status: 200, description: 'Health check result' })
  async checkHealth(@Param('name') name: string) {
    const plugin = this.registry.get(name);
    if (!plugin) {
      throw AppError.businessError(ErrorCode.BIZ_001, 'checkHealth', { name });
    }

    try {
      const isHealthy = await plugin.healthCheck();
      return {
        name,
        healthy: isHealthy,
        checkedAt: new Date(),
      };
    } catch (error) {
      return {
        name,
        healthy: false,
        error: error.message,
        checkedAt: new Date(),
      };
    }
  }

  @Get(':name/stats')
  @ApiOperation({ summary: 'Get data source statistics' })
  @ApiParam({ name: 'name', description: 'Data source name' })
  @ApiResponse({ status: 200, description: 'Data source statistics' })
  async getStats(@Param('name') name: string) {
    const stats = this.scheduler.getJobStats(name) as DataSourceJobStats;
    if (!stats) {
      throw AppError.businessError(ErrorCode.BIZ_001, 'getStats', { name });
    }

    return stats;
  }

  @Get('health/all')
  @ApiOperation({ summary: 'Check health of all data sources' })
  @ApiResponse({ status: 200, description: 'Health check results for all data sources' })
  async checkAllHealth() {
    const healthResults = await this.registry.performHealthCheck();
    return {
      total: healthResults.length,
      healthy: healthResults.filter(r => r.healthy).length,
      unhealthy: healthResults.filter(r => !r.healthy).length,
      results: healthResults,
      checkedAt: new Date(),
    };
  }

  @Get('validate/all')
  @ApiOperation({ summary: 'Validate configuration of all data sources' })
  @ApiResponse({ status: 200, description: 'Validation results for all data sources' })
  async validateAllConfigurations() {
    const validationResults = await this.registry.validateAllPlugins();
    return {
      total: validationResults.length,
      valid: validationResults.filter(r => r.valid).length,
      invalid: validationResults.filter(r => !r.valid).length,
      results: validationResults,
      validatedAt: new Date(),
    };
  }

  private getPluginType(plugin: any): string {
    // Extract plugin type from class name
    const className = plugin.constructor.name;
    return className.replace('Plugin', '').toLowerCase();
  }

  private async getPluginClass(type: string) {
    const pluginMap = {
      'airgradient': () => import('../plugins/airgradient.plugin').then(m => m.AirGradientPlugin),
      'dustboy': () => import('../plugins/dustboy.plugin').then(m => m.DustBoyPlugin),
      'purpleair': () => import('../plugins/purpleair.plugin').then(m => m.PurpleAirPlugin),
      'openaq': () => import('../plugins/openaq.plugin').then(m => m.OpenAQPlugin),
      'generic': () => import('../plugins/generic.plugin').then(m => m.GenericPlugin),
    };

    const loader = pluginMap[type.toLowerCase()];
    if (!loader) {
      throw AppError.businessError(
        ErrorCode.BIZ_001, 
        'getPluginClass',
        { type, availableTypes: Object.keys(pluginMap) }
      );
    }

    return await loader();
  }
}