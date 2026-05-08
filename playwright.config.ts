import { defineConfig } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir: './test/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { outputFolder: 'test/e2e-report' }]],
  use: {
    // Electron-specific: launched via the _electron fixture in each test file
    headless: false,
  },
  projects: [
    {
      name: 'electron',
      testMatch: '**/*.spec.ts',
    },
  ],
  // Build the app before running E2E tests
  globalSetup: path.resolve('./test/e2e/global-setup.ts'),
});
