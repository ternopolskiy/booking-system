import express, { Application } from 'express';
import bookingRoutes from './routes/bookingRoutes';
import { errorHandler } from './middleware/errorHandler';
import { db } from './database/connection';
import { runMigrations } from './database/migrations/migrate';

const app: Application = express();
const PORT = process.env.PORT || 3000; // На выбор так же либо с env либо просто в коде указываем данные

app.use(express.json());

app.use('/api/bookings', bookingRoutes);

app.use(errorHandler);

let server: any;

async function startServer() {
  try {
    await db.connect();
    await runMigrations();
    
    server = app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

async function gracefulShutdown() {
  console.log('Shutting down gracefully...');
  
  if (server) {
    server.close(() => {
      console.log('HTTP server closed');
    });
  }
  
  await db.shutdown();
  process.exit(0);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

if (require.main === module) {
  startServer();
}

export default app;
