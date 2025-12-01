import { db } from '../src/database/connection';
import { runMigrations } from '../src/database/migrations/migrate';

async function main() {
  try {
    await db.connect();
    await runMigrations();
    await db.shutdown();
    console.log('Migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main();
