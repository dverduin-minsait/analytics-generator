/**
 * Typed API surface that the Electron preload exposes to the Angular renderer
 * via contextBridge. This interface is the SINGLE SOURCE OF TRUTH for all
 * IPC communication — imported by both the preload and the Angular services.
 *
 * The renderer has NO direct access to Node.js or Electron APIs; everything
 * goes through this contract.
 */

import type { PhaseDescriptor, PhaseId } from './phase-descriptor';
import type { Project, ProjectMetadata } from './project';
import type { ExecutionOptions, ProgressEvent } from './phase-engine';
import type { LLMSettings } from './llm-config';

// ─── Project ─────────────────────────────────────────────────────────────────

export interface CreateProjectRequest {
  readonly name: string;
  readonly description?: string;
}

export interface OpenProjectRequest {
  readonly projectId: string;
}

export interface DeleteProjectRequest {
  readonly projectId: string;
}

// ─── Phase execution ─────────────────────────────────────────────────────────

export interface ExecutePhaseRequest {
  readonly projectId: string;
  readonly phaseId: PhaseId;
  /** Phase-specific input data. Typed at each PhaseEngine level. */
  readonly input: unknown;
  readonly options: ExecutionOptions;
}

export interface CancelPhaseRequest {
  readonly projectId: string;
  readonly phaseId: PhaseId;
}

// ─── File system ─────────────────────────────────────────────────────────────

export interface FileFilter {
  readonly name: string;
  readonly extensions: readonly string[];
}

export interface SelectFileOptions {
  readonly title?: string;
  readonly filters?: readonly FileFilter[];
}

// ─── LLM ─────────────────────────────────────────────────────────────────────

export interface LLMTestConnectionRequest {
  readonly providerType: string;
}

export interface LLMTestConnectionResult {
  readonly success: boolean;
  readonly latencyMs?: number;
  readonly error?: string;
}

// ─── The full typed bridge ────────────────────────────────────────────────────

export interface ElectronAPI {
  project: {
    create(req: CreateProjectRequest): Promise<Project>;
    open(req: OpenProjectRequest): Promise<Project>;
    list(): Promise<ProjectMetadata[]>;
    get(projectId: string): Promise<Project>;
    delete(req: DeleteProjectRequest): Promise<void>;
  };

  phase: {
    getDescriptors(): Promise<PhaseDescriptor[]>;
    /**
     * Starts phase execution on the main process. Progress is streamed back
     * via onPhaseProgress() events. Resolves when the phase has started
     * (not completed).
     */
    execute(req: ExecutePhaseRequest): Promise<void>;
    cancel(req: CancelPhaseRequest): Promise<void>;
  };

  filesystem: {
    selectFile(options?: SelectFileOptions): Promise<string | null>;
    selectFiles(options?: SelectFileOptions): Promise<string[]>;
    selectFolder(title?: string): Promise<string | null>;
    readTextFile(filePath: string): Promise<string>;
  };

  llm: {
    getSettings(): Promise<LLMSettings>;
    saveSettings(settings: LLMSettings): Promise<void>;
    testConnection(req: LLMTestConnectionRequest): Promise<LLMTestConnectionResult>;
  };

  /**
   * Subscribe to live progress events for a running phase.
   * @returns An unsubscribe function — call it in ngOnDestroy to prevent leaks.
   */
  onPhaseProgress(
    projectId: string,
    phaseId: PhaseId,
    callback: (event: ProgressEvent) => void,
  ): () => void;
}

// Augment the browser Window so Angular components can safely access the bridge
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
