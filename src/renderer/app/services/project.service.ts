import { Injectable, signal, computed } from '@angular/core';
import type { Project, ProjectMetadata } from '../../../shared/project';
import type { CreateProjectRequest } from '../../../shared/ipc-api';
import { ElectronService } from './electron.service';

@Injectable({ providedIn: 'root' })
export class ProjectService {
  // ── State ─────────────────────────────────────────────────────────────────
  readonly currentProject = signal<Project | null>(null);
  readonly recentProjects = signal<ProjectMetadata[]>([]);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  // ── Computed ──────────────────────────────────────────────────────────────
  readonly hasProject = computed(() => this.currentProject() !== null);
  readonly projectName = computed(() => this.currentProject()?.metadata.name ?? null);

  constructor(private readonly electron: ElectronService) {}

  // ── Commands ──────────────────────────────────────────────────────────────

  async loadRecentProjects(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const projects = await this.electron.project.list();
      this.recentProjects.set(projects);
    } catch (err) {
      this.error.set(this.extractMessage(err));
    } finally {
      this.isLoading.set(false);
    }
  }

  async createProject(req: CreateProjectRequest): Promise<Project> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const project = await this.electron.project.create(req);
      this.currentProject.set(project);
      return project;
    } catch (err) {
      this.error.set(this.extractMessage(err));
      throw err;
    } finally {
      this.isLoading.set(false);
    }
  }

  async openProject(projectId: string): Promise<Project> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const project = await this.electron.project.open({ projectId });
      this.currentProject.set(project);
      return project;
    } catch (err) {
      this.error.set(this.extractMessage(err));
      throw err;
    } finally {
      this.isLoading.set(false);
    }
  }

  clearError(): void {
    this.error.set(null);
  }

  private extractMessage(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
  }
}
