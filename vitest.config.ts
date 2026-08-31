/**
 * Vitest configuration for the SMC penalty system tests.
 *
 * We run tests in Node environment (no browser needed).
 * Path aliases match tsconfig.json so tests can import @/lib/penalty-engine directly.
 */

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/penalty-engine.ts', 'src/workers/penalty.worker.ts'],
      reporter: ['text', 'html'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
