import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    fileParallelism: false,
    maxConcurrency: 1,
    testTimeout: 20000,
    env: {
      NODE_ENV: 'test',
    },
    server: {
      deps: {
        external: ['node:sqlite'],
      },
    },
  },
});

