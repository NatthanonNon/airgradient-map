import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Pool, PoolClient, QueryResult } from 'pg';
import { CONNECTION_POOL } from './database.module-definition';

export interface QueryOptions {
  timeout?: number;
  retries?: number;
  transaction?: boolean;
}

@Injectable()
class DatabaseService implements OnModuleDestroy {
  private readonly logger = new Logger('Database');
  private readonly queryTimeout = 30000; // 30 seconds default timeout

  constructor(@Inject(CONNECTION_POOL) private readonly pool: Pool) {
    this.setupPoolEventHandlers();
  }

  private setupPoolEventHandlers() {
    this.pool.on('error', err => {
      this.logger.error('Unexpected error on idle client', err.stack);
    });

    this.pool.on('connect', () => {
      this.logger.debug('New client connected to pool');
    });

    this.pool.on('remove', () => {
      this.logger.debug('Client removed from pool');
    });
  }

  async onModuleDestroy() {
    await this.pool.end();
    this.logger.log('Database pool closed');
  }

  async runQuery<T = any>(
    query: string,
    params?: unknown[],
    options?: QueryOptions,
  ): Promise<QueryResult<T>> {
    const timeout = options?.timeout || this.queryTimeout;
    const retries = options?.retries || 0;

    let lastError: Error;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await this.queryWithLogging(this.pool, query, params, timeout);
      } catch (error) {
        lastError = error;
        if (attempt < retries) {
          this.logger.warn(`Query failed (attempt ${attempt + 1}/${retries + 1}), retrying...`);
          await this.delay(Math.pow(2, attempt) * 100); // Exponential backoff
        }
      }
    }

    throw lastError;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => {
      const timer = setTimeout(() => resolve(), ms);
      return timer;
    });
  }

  private getLogMessage(query: string, params?: unknown[]): string {
    const cleanQuery = query.replace(/\s+/g, ' ').trim();
    if (!params || params.length === 0) {
      return `Query: ${cleanQuery}`;
    }
    return `Query: ${cleanQuery} | Params: ${JSON.stringify(params)}`;
  }

  private async queryWithLogging<T = any>(
    source: Pool | PoolClient,
    query: string,
    params?: unknown[],
    timeout?: number,
  ): Promise<QueryResult<T>> {
    const message = this.getLogMessage(query, params);
    const startTime = Date.now();

    try {
      const queryConfig = {
        text: query,
        values: params,
        ...(timeout && { query_timeout: timeout }),
      };

      const result = await source.query<T>(queryConfig);

      const duration = Date.now() - startTime;

      if (duration > 1000) {
        this.logger.warn(`Slow query detected (${duration}ms): ${message}`);
      } else if (process.env.NODE_ENV !== 'production') {
        this.logger.debug(`Query executed (${duration}ms): ${message}`);
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Query failed (${duration}ms): ${message}`, error.stack);

      // Add more context to the error
      error.query = query;
      error.params = params;
      error.duration = duration;

      throw error;
    }
  }

  async getPoolClient(): Promise<PoolClient> {
    const poolClient = await this.pool.connect();
    const startTime = Date.now();

    return new Proxy(poolClient, {
      get: (target: PoolClient, propertyName: keyof PoolClient) => {
        if (propertyName === 'query') {
          return async (query: string, params?: unknown[]) => {
            return this.queryWithLogging(target, query, params);
          };
        }
        if (propertyName === 'release') {
          return () => {
            const duration = Date.now() - startTime;
            if (duration > 5000) {
              this.logger.warn(`Long-lived connection released after ${duration}ms`);
            }
            target.release();
          };
        }
        return target[propertyName];
      },
    });
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getPoolClient();

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Transaction rolled back', error.stack);
      throw error;
    } finally {
      client.release();
    }
  }

  // Health check method
  async isHealthy(): Promise<boolean> {
    try {
      const result = await this.runQuery('SELECT 1');
      return !!result;
    } catch (error) {
      this.logger.error('Health check failed', error.stack);
      return false;
    }
  }

  // Get pool statistics
  getPoolStats() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }
}

export default DatabaseService;
