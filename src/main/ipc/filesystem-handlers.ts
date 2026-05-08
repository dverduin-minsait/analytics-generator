import { ipcMain, dialog } from 'electron';
import * as fs from 'fs/promises';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import type { SelectFileOptions } from '../../shared/ipc-api';

export function registerFilesystemHandlers(): void {
  // ── Single file picker ────────────────────────────────────────────────────
  ipcMain.handle(
    IPC_CHANNELS.FS_SELECT_FILE,
    async (_event, options?: SelectFileOptions) => {
      const result = await dialog.showOpenDialog({
        title: options?.title ?? 'Select File',
        filters: options?.filters
          ? options.filters.map((f) => ({ name: f.name, extensions: [...f.extensions] }))
          : [],
        properties: ['openFile'],
      });
      return result.canceled || result.filePaths.length === 0
        ? null
        : result.filePaths[0];
    },
  );

  // ── Multi-file picker ─────────────────────────────────────────────────────
  ipcMain.handle(
    IPC_CHANNELS.FS_SELECT_FILES,
    async (_event, options?: SelectFileOptions) => {
      const result = await dialog.showOpenDialog({
        title: options?.title ?? 'Select Files',
        filters: options?.filters
          ? options.filters.map((f) => ({ name: f.name, extensions: [...f.extensions] }))
          : [],
        properties: ['openFile', 'multiSelections'],
      });
      return result.canceled ? [] : result.filePaths;
    },
  );

  // ── Folder picker ─────────────────────────────────────────────────────────
  ipcMain.handle(
    IPC_CHANNELS.FS_SELECT_FOLDER,
    async (_event, title?: string) => {
      const result = await dialog.showOpenDialog({
        title: title ?? 'Select Folder',
        properties: ['openDirectory'],
      });
      return result.canceled || result.filePaths.length === 0
        ? null
        : result.filePaths[0];
    },
  );

  // ── Read text file ────────────────────────────────────────────────────────
  // Security: only reads files; never executes them. Path is passed from the
  // renderer but the operation is sandboxed to reading UTF-8 text.
  ipcMain.handle(
    IPC_CHANNELS.FS_READ_TEXT_FILE,
    async (_event, filePath: string) => {
      // Basic path validation: ensure it's a non-empty string
      if (!filePath || typeof filePath !== 'string') {
        throw new Error('Invalid file path');
      }
      return fs.readFile(filePath, 'utf-8');
    },
  );
}
