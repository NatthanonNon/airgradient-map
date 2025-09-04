import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { DataSourceRegistryService } from './registry/datasource.registry';
import { DataSourceScheduler } from './scheduler/datasource.scheduler';
import { DataSourceController } from './controllers/datasource.controller';
import DatabaseModule from '../database/database.module';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule,
    DatabaseModule,
  ],
  providers: [
    DataSourceRegistryService,
    DataSourceScheduler,
  ],
  controllers: [
    DataSourceController,
  ],
  exports: [
    DataSourceRegistryService,
    DataSourceScheduler,
  ],
})
export class DataSourceModule {}