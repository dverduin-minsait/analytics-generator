/**
 * All IPC channel names used between the Electron main process and the
 * Angular renderer. Keeping them in one place prevents typos and enables
 * TypeScript to enforce correct usage on both sides.
 */
export const IPC_CHANNELS = {
  // ── Project management ────────────────────────────────────────────────────
  PROJECT_CREATE: 'project:create',
  PROJECT_OPEN: 'project:open',
  PROJECT_LIST: 'project:list',
  PROJECT_GET: 'project:get',
  PROJECT_SAVE: 'project:save',
  PROJECT_DELETE: 'project:delete',

  // ── Phase operations (renderer → main) ───────────────────────────────────
  PHASE_GET_DESCRIPTORS: 'phase:getDescriptors',
  PHASE_EXECUTE: 'phase:execute',
  PHASE_CANCEL: 'phase:cancel',
  /** Returns a clipboard-ready prompt the user can paste into any chatbot */
  PHASE_GET_PROMPT: 'phase:getPrompt',

  // ── Phase progress stream (main → renderer via webContents.send) ─────────
  // Runtime channel name is: `${PHASE_PROGRESS_EVENT}:${projectId}:${phaseId}`
  PHASE_PROGRESS_EVENT: 'phase:progressEvent',

  // ── File system ───────────────────────────────────────────────────────────
  FS_SELECT_FILE: 'fs:selectFile',
  FS_SELECT_FILES: 'fs:selectFiles',
  FS_SELECT_FOLDER: 'fs:selectFolder',
  FS_READ_TEXT_FILE: 'fs:readTextFile',

  // ── LLM configuration ─────────────────────────────────────────────────────
  LLM_GET_SETTINGS: 'llm:getSettings',
  LLM_SAVE_SETTINGS: 'llm:saveSettings',
  LLM_TEST_CONNECTION: 'llm:testConnection',
} as const;

export type IPCChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];
