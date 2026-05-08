/**
 * Central IPC handler registration.
 * Called once from main.ts after app.whenReady().
 */

import { registerProjectHandlers } from './project-handlers';
import { registerPhaseHandlers } from './phase-handlers';
import { registerFilesystemHandlers } from './filesystem-handlers';
import { registerLLMHandlers } from './llm-handlers';

export function registerAllIPCHandlers(): void {
  registerProjectHandlers();
  registerPhaseHandlers();
  registerFilesystemHandlers();
  registerLLMHandlers();
}
