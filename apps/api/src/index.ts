import { createApp } from './app.js';
import { CONFIG } from './config.js';
import { initDatabase } from './db/index.js';

// Ensure database schema is ready
initDatabase();

const app = createApp();

const server = app.listen(CONFIG.PORT, () => {
  console.log(`=================================================`);
  console.log(`🚀 TaskForge API Server running on port ${CONFIG.PORT}`);
  console.log(`📡 Health: http://localhost:${CONFIG.PORT}/api/health`);
  console.log(`🗄️ Database: ${CONFIG.DATABASE_PATH}`);
  console.log(`=================================================`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    process.exit(0);
  });
});
