import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const CONFIG = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 4000,
  DATABASE_PATH: process.env.DATABASE_PATH || path.resolve(__dirname, '../../../taskforge.db'),
  JWT_SECRET: process.env.JWT_SECRET || 'taskforge-super-secret-dev-jwt-key-2026',
  JWT_EXPIRES_IN: 60 * 60 * 24 * 7, // 7 days in seconds
  NODE_ENV: process.env.NODE_ENV || 'development',
};
