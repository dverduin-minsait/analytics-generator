/**
 * ProjectManager — manages the lifecycle of analytics projects on disk.
 *
 * Storage layout (under ~/.analytics-platform/):
 *   projects/
 *     <uuid>/
 *       project.json       ← ProjectMetadata + phase states
 *       phases/            ← per-phase intermediate working files
 *       artifacts/         ← versioned phase output artifacts (JSON)
 *       history/           ← append-only audit log entries (NDJSON)
 *
 * All writes use atomic rename-over-temp to prevent partial writes.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { randomUUID } from 'crypto';
import type { Project, ProjectMetadata, PhaseState } from '../../shared/project';
import type { CreateProjectRequest } from '../../shared/ipc-api';
import { PhaseId } from '../../shared/phase-descriptor';

const SCHEMA_VERSION = '1.0.0';

const PLATFORM_ROOT = path.join(os.homedir(), '.analytics-platform');
const PROJECTS_ROOT = path.join(PLATFORM_ROOT, 'projects');

export class ProjectManager {
  private static instance: ProjectManager;

  private constructor() {}

  static getInstance(): ProjectManager {
    if (!ProjectManager.instance) {
      ProjectManager.instance = new ProjectManager();
    }
    return ProjectManager.instance;
  }

  // ── Create ──────────────────────────────────────────────────────────────

  async createProject(req: CreateProjectRequest): Promise<Project> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const rootPath = path.join(PROJECTS_ROOT, id);

    // Create the full directory structure
    await fs.mkdir(path.join(rootPath, 'phases'), { recursive: true });
    await fs.mkdir(path.join(rootPath, 'artifacts'), { recursive: true });
    await fs.mkdir(path.join(rootPath, 'history'), { recursive: true });

    const project: Project = {
      metadata: {
        id,
        name: req.name.trim(),
        description: req.description?.trim(),
        createdAt: now,
        updatedAt: now,
        schemaVersion: SCHEMA_VERSION,
      },
      currentPhaseId: PhaseId.IntentAnalysis,
      phases: this.buildInitialPhaseStates(),
      rootPath,
    };

    await this.writeProjectFile(project);
    await this.appendHistory(rootPath, { event: 'created', timestamp: now });

    return project;
  }

  // ── Read ─────────────────────────────────────────────────────────────────

  async getProject(projectId: string): Promise<Project> {
    const rootPath = path.join(PROJECTS_ROOT, projectId);
    const raw = await fs.readFile(path.join(rootPath, 'project.json'), 'utf-8');
    const data = JSON.parse(raw) as Project;
    // Ensure rootPath is always the canonical on-disk location
    return { ...data, rootPath };
  }

  async listProjects(): Promise<ProjectMetadata[]> {
    await fs.mkdir(PROJECTS_ROOT, { recursive: true });

    let entries: string[];
    try {
      entries = await fs.readdir(PROJECTS_ROOT);
    } catch {
      return [];
    }

    const results = await Promise.allSettled(
      entries.map(async (entry) => {
        const projectFile = path.join(PROJECTS_ROOT, entry, 'project.json');
        const raw = await fs.readFile(projectFile, 'utf-8');
        const data = JSON.parse(raw) as Project;
        return data.metadata;
      }),
    );

    return results
      .filter((r): r is PromiseFulfilledResult<ProjectMetadata> => r.status === 'fulfilled')
      .map((r) => r.value)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  // ── Update ───────────────────────────────────────────────────────────────

  async saveProject(project: Project): Promise<void> {
    const updated: Project = {
      ...project,
      metadata: {
        ...project.metadata,
        updatedAt: new Date().toISOString(),
      },
    };
    await this.writeProjectFile(updated);
  }

  // ── Delete ───────────────────────────────────────────────────────────────

  async deleteProject(projectId: string): Promise<void> {
    const rootPath = path.join(PROJECTS_ROOT, projectId);
    await fs.rm(rootPath, { recursive: true, force: true });
  }

  // ── Artifact helpers ─────────────────────────────────────────────────────

  /**
   * Write an artifact JSON file for a specific phase output.
   * Returns the relative path (from project root) for storage in PhaseState.
   */
  async writeArtifact(
    projectId: string,
    artifactId: string,
    data: unknown,
  ): Promise<string> {
    const rootPath = path.join(PROJECTS_ROOT, projectId);
    const relativePath = path.join('artifacts', `${artifactId}.json`);
    const fullPath = path.join(rootPath, relativePath);
    await this.atomicWrite(fullPath, JSON.stringify(data, null, 2));
    return relativePath;
  }

  async readArtifact<T>(projectId: string, relativePath: string): Promise<T> {
    const rootPath = path.join(PROJECTS_ROOT, projectId);
    const raw = await fs.readFile(path.join(rootPath, relativePath), 'utf-8');
    return JSON.parse(raw) as T;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async writeProjectFile(project: Project): Promise<void> {
    const filePath = path.join(project.rootPath, 'project.json');
    await this.atomicWrite(filePath, JSON.stringify(project, null, 2));
  }

  /**
   * Atomic write: write to a temp file then rename over the target.
   * Prevents partial writes from corrupting the project state.
   */
  private async atomicWrite(filePath: string, content: string): Promise<void> {
    const tmp = `${filePath}.tmp`;
    await fs.writeFile(tmp, content, 'utf-8');
    await fs.rename(tmp, filePath);
  }

  private async appendHistory(
    rootPath: string,
    entry: Record<string, unknown>,
  ): Promise<void> {
    const logFile = path.join(rootPath, 'history', 'audit.ndjson');
    const line = JSON.stringify(entry) + '\n';
    await fs.appendFile(logFile, line, 'utf-8');
  }

  private buildInitialPhaseStates(): PhaseState[] {
    return Object.values(PhaseId)
      .filter((v): v is PhaseId => typeof v === 'number')
      .map((phaseId) => ({
        phaseId,
        status: 'not-started' as const,
        artifactPaths: {},
        llmAssisted: false,
      }));
  }
}
