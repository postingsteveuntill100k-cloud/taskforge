import { initDatabase } from '../db/index.js';

console.log('Running TaskForge database migrations...');
const db = initDatabase();
console.log('✓ Database schema migrated successfully.');
