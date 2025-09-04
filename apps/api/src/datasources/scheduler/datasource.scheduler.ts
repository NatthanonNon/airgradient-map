import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { DataSourceRegistryService } from '../registry/datasource.registry';
import { DataSourcePlugin, MeasurementData } from '../interfaces/datasource-plugin.interface';
import DatabaseService from '../../database/database.service';
import { AppError, ErrorCode } from '../../common/errors';

export interface DataSourceJobStats {
  name: string;
  enabled: boolean;
  cronSchedule: string;
  lastRun?: Date;
  lastSuccess?: Date;
  lastError?: string;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  averageRecords: number;
  averageRunTime: number;
}

@Injectable()
export class DataSourceScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DataSourceScheduler.name);
  private readonly jobStats = new Map<string, DataSourceJobStats>();

  constructor(
    private readonly registry: DataSourceRegistryService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly databaseService: DatabaseService,
  ) {}

  async onModuleInit() {
    this.logger.log('Starting data source scheduler...');
    await this.scheduleEnabledDataSources();
  }

  async onModuleDestroy() {
    this.logger.log('Stopping data source scheduler...');
    this.stopAllJobs();
  }

  private async scheduleEnabledDataSources() {
    const enabledPlugins = this.registry.getEnabled();
    
    this.logger.log(`Scheduling ${enabledPlugins.length} enabled data sources`);

    for (const plugin of enabledPlugins) {
      await this.schedulePlugin(plugin);
    }
  }

  async schedulePlugin(plugin: DataSourcePlugin): Promise<void> {
    const jobName = this.getJobName(plugin.name);

    try {
      // Initialize job stats
      this.jobStats.set(plugin.name, {
        name: plugin.name,
        enabled: true,
        cronSchedule: plugin.config.cronSchedule,
        totalRuns: 0,
        successfulRuns: 0,
        failedRuns: 0,
        averageRecords: 0,
        averageRunTime: 0,
      });

      // Create the cron job
      const job = new CronJob(
        plugin.config.cronSchedule,
        () => this.executeDataSourceJob(plugin),
        null,
        false, // Don't start immediately
        'UTC' // Use UTC timezone
      );

      // Add to scheduler registry
      this.schedulerRegistry.addCronJob(jobName, job);

      // Start the job
      job.start();

      this.logger.log(`Scheduled ${plugin.name} with cron: ${plugin.config.cronSchedule}`);

    } catch (error) {
      this.logger.error(`Failed to schedule ${plugin.name}:`, error.message);
      throw AppError.businessError(
        ErrorCode.BIZ_003,
        'schedulePlugin',
        error,
        { pluginName: plugin.name, cronSchedule: plugin.config.cronSchedule }
      );
    }
  }

  async unschedulePlugin(pluginName: string): Promise<void> {
    const jobName = this.getJobName(pluginName);

    try {
      this.schedulerRegistry.deleteCronJob(jobName);
      
      // Update stats
      const stats = this.jobStats.get(pluginName);
      if (stats) {
        stats.enabled = false;
        this.jobStats.set(pluginName, stats);
      }

      this.logger.log(`Unscheduled data source: ${pluginName}`);
    } catch (error) {
      this.logger.warn(`Failed to unschedule ${pluginName}:`, error.message);
    }
  }

  private async executeDataSourceJob(plugin: DataSourcePlugin): Promise<void> {
    const startTime = Date.now();
    const stats = this.jobStats.get(plugin.name);

    if (!stats) {
      this.logger.error(`No stats found for plugin: ${plugin.name}`);
      return;
    }

    stats.lastRun = new Date();
    stats.totalRuns++;

    this.logger.debug(`Executing data source job: ${plugin.name}`);

    try {
      // Health check before processing
      const isHealthy = await plugin.healthCheck();
      if (!isHealthy) {
        throw new Error(`Health check failed for ${plugin.name}`);
      }

      // Fetch raw data from external API
      const rawData = await plugin.fetchData();
      
      if (!rawData || rawData.length === 0) {
        this.logger.warn(`No data received from ${plugin.name}`);
        return;
      }

      // Transform data to our format
      const transformedData = await plugin.transformData(rawData);
      
      if (transformedData.length === 0) {
        this.logger.warn(`No valid data after transformation for ${plugin.name}`);
        return;
      }

      // Store data in database
      const storedCount = await this.storeData(transformedData);
      
      // Update stats
      const runTime = Date.now() - startTime;
      stats.successfulRuns++;
      stats.lastSuccess = new Date();
      stats.lastError = undefined;
      stats.averageRecords = this.updateAverage(stats.averageRecords, storedCount, stats.successfulRuns);
      stats.averageRunTime = this.updateAverage(stats.averageRunTime, runTime, stats.totalRuns);

      this.logger.log(
        `Successfully processed ${storedCount} records from ${plugin.name} in ${runTime}ms`
      );

    } catch (error) {
      const runTime = Date.now() - startTime;
      stats.failedRuns++;
      stats.lastError = error.message;
      stats.averageRunTime = this.updateAverage(stats.averageRunTime, runTime, stats.totalRuns);

      this.logger.error(`Data source job failed for ${plugin.name}:`, error.message);
      
      // Don't throw - let other jobs continue
    } finally {
      this.jobStats.set(plugin.name, stats);
    }
  }

  private async storeData(measurements: MeasurementData[]): Promise<number> {
    let storedCount = 0;

    try {
      await this.databaseService.transaction(async (client) => {
        for (const measurement of measurements) {
          try {
            // Insert or update location
            await client.query(`
              INSERT INTO location (id, location_name, coordinate, sensor_type, data_source)
              VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326), $5, $6)
              ON CONFLICT (id) DO UPDATE SET
                location_name = EXCLUDED.location_name,
                coordinate = EXCLUDED.coordinate,
                sensor_type = EXCLUDED.sensor_type,
                data_source = EXCLUDED.data_source,
                updated_at = NOW()
            `, [
              measurement.locationId,
              measurement.locationName,
              measurement.longitude,
              measurement.latitude,
              measurement.sensorType,
              measurement.dataSource
            ]);

            // Insert measurement
            await client.query(`
              INSERT INTO measurement (
                location_id, pm25, pm10, atmp, rhum, rco2, o3, no2, measured_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
              ON CONFLICT (location_id, measured_at) DO UPDATE SET
                pm25 = EXCLUDED.pm25,
                pm10 = EXCLUDED.pm10,
                atmp = EXCLUDED.atmp,
                rhum = EXCLUDED.rhum,
                rco2 = EXCLUDED.rco2,
                o3 = EXCLUDED.o3,
                no2 = EXCLUDED.no2
            `, [
              measurement.locationId,
              measurement.pm25,
              measurement.pm10,
              measurement.atmp,
              measurement.rhum,
              measurement.rco2,
              measurement.o3,
              measurement.no2,
              measurement.measuredAt
            ]);

            storedCount++;
          } catch (error) {
            this.logger.warn(`Failed to store measurement for location ${measurement.locationId}:`, error.message);
          }
        }
      });

    } catch (error) {
      throw AppError.databaseError(
        ErrorCode.DB_001,
        'storeData',
        error,
        { measurementCount: measurements.length }
      );
    }

    return storedCount;
  }

  private updateAverage(currentAverage: number, newValue: number, count: number): number {
    return ((currentAverage * (count - 1)) + newValue) / count;
  }

  private getJobName(pluginName: string): string {
    return `datasource-${pluginName}`;
  }

  private stopAllJobs(): void {
    for (const pluginName of this.jobStats.keys()) {
      try {
        this.unschedulePlugin(pluginName);
      } catch (error) {
        this.logger.error(`Failed to stop job for ${pluginName}:`, error.message);
      }
    }
  }

  // Public methods for management
  
  async enableDataSource(name: string): Promise<void> {
    await this.registry.enablePlugin(name);
    const plugin = this.registry.get(name);
    if (plugin) {
      await this.schedulePlugin(plugin);
    }
  }

  async disableDataSource(name: string): Promise<void> {
    await this.registry.disablePlugin(name);
    await this.unschedulePlugin(name);
  }

  async triggerManualRun(name: string): Promise<void> {
    const plugin = this.registry.get(name);
    if (!plugin) {
      throw AppError.businessError(ErrorCode.BIZ_001, 'triggerManualRun', { name });
    }

    this.logger.log(`Triggering manual run for ${name}`);
    await this.executeDataSourceJob(plugin);
  }

  getJobStats(name?: string): DataSourceJobStats | DataSourceJobStats[] {
    if (name) {
      return this.jobStats.get(name) || null;
    }
    return Array.from(this.jobStats.values());
  }

  async getDataSourceStatus(): Promise<{
    total: number;
    enabled: number;
    running: number;
    failed: number;
    stats: DataSourceJobStats[];
  }> {
    const stats = Array.from(this.jobStats.values());
    
    return {
      total: stats.length,
      enabled: stats.filter(s => s.enabled).length,
      running: stats.filter(s => s.enabled && s.lastRun && !s.lastError).length,
      failed: stats.filter(s => s.lastError).length,
      stats,
    };
  }
}