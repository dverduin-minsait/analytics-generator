/**
 * ElectronService — the ONLY way Angular components and services access
 * Electron/Node functionality. All calls go through window.electronAPI,
 * which is populated by the preload script via contextBridge.
 *
 * In development (browser-only, without Electron), a warning is logged and
 * methods return safe fallback values so UI development remains possible.
 */

import { Injectable } from '@angular/core';
import type { ElectronAPI } from '../../../shared/ipc-api';

function getAPI(): ElectronAPI | null {
  if (typeof window !== 'undefined' && 'electronAPI' in window) {
    return window.electronAPI;
  }
  console.warn(
    '[ElectronService] window.electronAPI is not available. ' +
    'Running outside of Electron? Some features will not work.',
  );
  return null;
}

@Injectable({ providedIn: 'root' })
export class ElectronService {
  private readonly api = getAPI();

  get isElectron(): boolean {
    return this.api !== null;
  }

  get project(): ElectronAPI['project'] {
    this.assertAPI();
    return this.api!.project;
  }

  get phase(): ElectronAPI['phase'] {
    this.assertAPI();
    return this.api!.phase;
  }

  get filesystem(): ElectronAPI['filesystem'] {
    this.assertAPI();
    return this.api!.filesystem;
  }

  get llm(): ElectronAPI['llm'] {
    this.assertAPI();
    return this.api!.llm;
  }

  get onPhaseProgress(): ElectronAPI['onPhaseProgress'] {
    this.assertAPI();
    return this.api!.onPhaseProgress.bind(this.api);
  }

  private assertAPI(): void {
    if (!this.api) {
      throw new Error(
        'ElectronService: window.electronAPI is not available. ' +
        'This feature requires running inside Electron.',
      );
    }
  }
}
