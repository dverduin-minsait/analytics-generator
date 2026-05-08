/**
 * E2E Global Setup — builds the app before running tests.
 * Playwright calls this before the test suite.
 */

import { execSync } from 'child_process';

export default async function globalSetup() {
  console.log('[E2E Setup] Building app for Electron...');
  execSync('npm run build', { stdio: 'inherit' });
  console.log('[E2E Setup] Build complete.');
}
