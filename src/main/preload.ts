/**
 * Electron preload script.
 *
 * This file is BUNDLED by esbuild into a single self-contained JS file
 * (dist/main/preload.js) so that it works in a sandboxed renderer process
 * without needing to require() local modules at runtime.
 *
 * Only 'electron' is treated as external — everything else is inlined.
 *
 * Security rules:
 * - Only whitelisted IPC channels are exposed (allowlist approach).
 * - No Node.js APIs are forwarded to the renderer.
 * - The renderer cannot invoke arbitrary IPC channels.
 */

import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import { IPC_CHANNELS } from '../shared/ipc-channels';
import type { ElectronAPI } from '../shared/ipc-api';
import type { PhaseId } from '../shared/phase-descriptor';
import type { ProgressEvent } from '../shared/phase-engine';

// ─── Build the typed API object ───────────────────────────────────────────────

const electronAPI: ElectronAPI = {
  // ── Project ──────────────────────────────────────────────────────────────
  project: {
    create: (req) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_CREATE, req),
    open: (req) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_OPEN, req),
    list: () => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_LIST),
    get: (projectId) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_GET, projectId),
    delete: (req) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_DELETE, req),
  },

  // ── Phase ────────────────────────────────────────────────────────────────
  phase: {
    getDescriptors: () => ipcRenderer.invoke(IPC_CHANNELS.PHASE_GET_DESCRIPTORS),
    execute: (req) => ipcRenderer.invoke(IPC_CHANNELS.PHASE_EXECUTE, req),
    cancel: (req) => ipcRenderer.invoke(IPC_CHANNELS.PHASE_CANCEL, req),
  },

  // ── File system ──────────────────────────────────────────────────────────
  filesystem: {
    selectFile: (options) =>
      ipcRenderer.invoke(IPC_CHANNELS.FS_SELECT_FILE, options),
    selectFiles: (options) =>
      ipcRenderer.invoke(IPC_CHANNELS.FS_SELECT_FILES, options),
    selectFolder: (title) =>
      ipcRenderer.invoke(IPC_CHANNELS.FS_SELECT_FOLDER, title),
    readTextFile: (filePath) =>
      ipcRenderer.invoke(IPC_CHANNELS.FS_READ_TEXT_FILE, filePath),
  },

  // ── LLM ──────────────────────────────────────────────────────────────────
  llm: {
    getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.LLM_GET_SETTINGS),
    saveSettings: (settings) =>
      ipcRenderer.invoke(IPC_CHANNELS.LLM_SAVE_SETTINGS, settings),
    testConnection: (req) =>
      ipcRenderer.invoke(IPC_CHANNELS.LLM_TEST_CONNECTION, req),
  },

  // ── Progress event subscription ───────────────────────────────────────────
  onPhaseProgress: (
    projectId: string,
    phaseId: PhaseId,
    callback: (event: ProgressEvent) => void,
  ): (() => void) => {
    // Scoped channel prevents cross-project event leakage
    const channel = `${IPC_CHANNELS.PHASE_PROGRESS_EVENT}:${projectId}:${phaseId}`;
    const handler = (_ipcEvent: IpcRendererEvent, progressEvent: ProgressEvent) => {
      callback(progressEvent);
    };
    ipcRenderer.on(channel, handler);
    // Return unsubscribe so callers can clean up in ngOnDestroy
    return () => ipcRenderer.removeListener(channel, handler);
  },
};

// ── Expose to renderer world ─────────────────────────────────────────────────
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
