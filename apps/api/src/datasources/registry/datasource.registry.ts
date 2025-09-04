import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSourcePlugin, DataSourceRegistry } from '../interfaces/datasource-plugin.interface';
import { AppError, ErrorCode } from '../../common/errors';

@Injectable()
export class DataSourceRegistryService implements DataSourceRegistry, OnModuleInit {
  private readonly logger = new Logger(DataSourceRegistryService.name);
  private readonly plugins = new Map<string, DataSourcePlugin>();
  private readonly enabledPlugins = new Set<string>();

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    this.logger.log('Initializing data source registry...');
    await this.loadPluginsFromConfig();
  }

  private async loadPluginsFromConfig() {
    const dataSourceConfigs = this.configService.get<any[]>('dataSources', []);
    
    this.logger.log(`Loading ${dataSourceConfigs.length} data source configurations`);
    
    for (const config of dataSourceConfigs) {
      try {
        await this.createAndRegisterPlugin(config);
      } catch (error) {
        this.logger.error(`Failed to load data source ${config.name}:`, error.message);
      }
    }

    this.logger.log(`Registry initialized with ${this.plugins.size} plugins (${this.enabledPlugins.size} enabled)`);
  }

  private async createAndRegisterPlugin(config: any) {
    // Dynamically import and create plugin based on type
    const PluginClass = await this.getPluginClass(config.type || 'generic');
    const plugin = new PluginClass(config);
    
    // Validate plugin configuration
    const isValid = await plugin.validateConfig();
    if (!isValid) {
      throw new Error(`Invalid configuration for data source ${config.name}`);
    }

    this.register(plugin);
    
    if (config.enabled) {
      this.enabledPlugins.add(config.name);
      this.logger.log(`Enabled data source: ${config.name}`);
    }
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

  register(plugin: DataSourcePlugin): void {
    if (this.plugins.has(plugin.name)) {
      this.logger.warn(`Data source ${plugin.name} already registered, replacing...`);
    }

    this.plugins.set(plugin.name, plugin);
    this.logger.debug(`Registered data source plugin: ${plugin.name}`);
  }

  unregister(name: string): void {
    const removed = this.plugins.delete(name);
    this.enabledPlugins.delete(name);
    
    if (removed) {
      this.logger.debug(`Unregistered data source plugin: ${name}`);
    }
  }

  get(name: string): DataSourcePlugin | undefined {
    return this.plugins.get(name);
  }

  getAll(): DataSourcePlugin[] {
    return Array.from(this.plugins.values());
  }

  getEnabled(): DataSourcePlugin[] {
    return Array.from(this.plugins.values()).filter(plugin => 
      this.enabledPlugins.has(plugin.name)
    );
  }

  async enablePlugin(name: string): Promise<void> {
    const plugin = this.get(name);
    if (!plugin) {
      throw AppError.businessError(ErrorCode.BIZ_001, 'enablePlugin', { name });
    }

    const isHealthy = await plugin.healthCheck();
    if (!isHealthy) {
      throw AppError.businessError(ErrorCode.BIZ_002, 'enablePlugin', { name, reason: 'Health check failed' });
    }

    this.enabledPlugins.add(name);
    this.logger.log(`Enabled data source: ${name}`);
  }

  async disablePlugin(name: string): Promise<void> {
    this.enabledPlugins.delete(name);
    this.logger.log(`Disabled data source: ${name}`);
  }

  getPluginStatus() {
    return Array.from(this.plugins.values()).map(plugin => ({
      name: plugin.name,
      enabled: this.enabledPlugins.has(plugin.name),
      metadata: plugin.getMetadata(),
      config: {
        cronSchedule: plugin.config.cronSchedule,
        baseUrl: plugin.config.apiConfig.baseUrl,
      }
    }));
  }

  async validateAllPlugins(): Promise<{ name: string; valid: boolean; error?: string }[]> {
    const results = [];
    
    for (const plugin of this.plugins.values()) {
      try {
        const isValid = await plugin.validateConfig();
        results.push({ name: plugin.name, valid: isValid });
      } catch (error) {
        results.push({ 
          name: plugin.name, 
          valid: false, 
          error: error.message 
        });
      }
    }

    return results;
  }

  async performHealthCheck(): Promise<{ name: string; healthy: boolean; error?: string }[]> {
    const results = [];
    
    for (const plugin of this.getEnabled()) {
      try {
        const isHealthy = await plugin.healthCheck();
        results.push({ name: plugin.name, healthy: isHealthy });
      } catch (error) {
        results.push({ 
          name: plugin.name, 
          healthy: false, 
          error: error.message 
        });
      }
    }

    return results;
  }
}