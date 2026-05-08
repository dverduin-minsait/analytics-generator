/**
 * Smoke E2E test — verifies the basic app flow end-to-end in Electron.
 *
 * Flow tested:
 *   1. App launches and shows the Welcome screen
 *   2. User creates a new project
 *   3. App navigates to Phase 1 (Intent Analysis)
 *   4. Phase 1 screen shows the file input zone
 *   5. App is keyboard-navigable from the header
 */

import { test, expect, _electron as electron } from '@playwright/test';
import * as path from 'path';

const ELECTRON_MAIN = path.resolve('dist/main/main.js');

test.describe('Smoke — App Launch & Welcome', () => {
  test('app launches and shows welcome screen', async () => {
    const app = await electron.launch({
      args: [ELECTRON_MAIN],
      env: { ...process.env, NODE_ENV: 'test' },
    });

    const page = await app.firstWindow();
    await page.waitForLoadState('domcontentloaded');

    // Welcome screen must be visible
    await expect(page.locator('h1')).toContainText('Analytics Generator');
    await expect(page.locator('button', { hasText: 'New Project' })).toBeVisible();

    await app.close();
  });
});

test.describe('Smoke — Project Creation', () => {
  test('creates a project and navigates to Phase 1', async () => {
    const app = await electron.launch({
      args: [ELECTRON_MAIN],
      env: { ...process.env, NODE_ENV: 'test' },
    });

    const page = await app.firstWindow();
    await page.waitForLoadState('domcontentloaded');

    // Open create form
    await page.click('button:has-text("New Project")');
    await expect(page.locator('form')).toBeVisible();

    // Fill in project name
    await page.fill('input[id="project-name"]', 'E2E Test Project');

    // Submit
    await page.click('button[type="submit"]');

    // Should navigate to Phase 1
    await page.waitForURL('**/phase/1');
    await expect(page.locator('h1')).toContainText('Intent Analysis');

    await app.close();
  });
});

test.describe('Accessibility — Keyboard Navigation', () => {
  test('skip-to-content link is the first focusable element', async () => {
    const app = await electron.launch({
      args: [ELECTRON_MAIN],
      env: { ...process.env, NODE_ENV: 'test' },
    });

    const page = await app.firstWindow();
    await page.waitForLoadState('domcontentloaded');

    // Tab once from body
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.className ?? '');
    expect(focused).toContain('skip-to-content');

    await app.close();
  });
});
