import { Pool, PoolClient } from 'pg';
import { databaseConfig } from '../config/database.config';

class DatabaseConnection {
  private pool: Pool;
  private isInitialized: boolean = false;

  constructor() {
    this.pool = new Pool(databaseConfig);
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.pool.on('error', (err: Error) => {
      console.error('Unexpected database pool error:', err);
      process.exit(1);
    });

    this.pool.on('connect', () => {
      if (!this.isInitialized) {
        console.log('Database connection pool established');
        this.isInitialized = true;
      }
    });
  }

  async connect(): Promise<void> {
    try {
      const client = await this.pool.connect();
      console.log('Successfully connected to PostgreSQL database');
      client.release();
    } catch (error) {
      console.error('Failed to connect to database:', error);
      throw error;
    }
  }

  getPool(): Pool {
    return this.pool;
  }

  async query(text: string, params?: any[]): Promise<any> {
    return this.pool.query(text, params);
  }

  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  async shutdown(): Promise<void> {
    try {
      await this.pool.end();
      console.log('Database connection pool closed gracefully');
    } catch (error) {
      console.error('Error closing database pool:', error);
      throw error;
    }
  }
}

export const db = new DatabaseConnection();
