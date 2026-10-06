import { defineConfig } from 'vitest/config';

export default defineConfig({
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
