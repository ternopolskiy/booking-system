import { readFileSync } from 'fs';
import { join } from 'path';
import { db } from '../connection';

export async function runMigrations(): Promise<void> {
  try {
    const migrationSQL = readFileSync(
      join(__dirname, '001_create_tables.sql'),
      'utf-8'
    );
    
    await db.query(migrationSQL);
    console.log('Database migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}
