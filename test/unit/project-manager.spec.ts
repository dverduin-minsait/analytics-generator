/**
 * Unit tests for ProjectManager.
 * These tests exercise the file-system-backed CRUD operations
 * using a temporary directory to avoid touching ~/.analytics-platform.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// We partially mock the ProjectManager to redirect its storage to a temp dir.
// Because ProjectManager uses os.homedir() + hardcoded paths internally,
// we override the internal root by setting an env variable before importing.
const TMP_ROOT = path.join(os.tmpdir(), `analytics-test-${Date.now()}`);
process.env['ANALYTICS_PLATFORM_ROOT'] = TMP_ROOT;

import { ProjectManager } from '../../src/main/services/project-manager';

describe('ProjectManager', () => {
  afterAll(async () => {
    await fs.rm(TMP_ROOT, { recursive: true, force: true });
  });

  it('creates a project and returns it with correct metadata', async () => {
    const manager = ProjectManager.getInstance();
    const project = await manager.createProject({ name: 'Test Project' });

    expect(project.metadata.id).toBeTruthy();
    expect(project.metadata.name).toBe('Test Project');
    expect(project.metadata.schemaVersion).toBe('1.0.0');
    expect(project.phases).toHaveLength(10); // one per PhaseId
    expect(project.rootPath).toContain(project.metadata.id);
  });

  it('persists project to disk and can be retrieved', async () => {
    const manager = ProjectManager.getInstance();
    const created = await manager.createProject({ name: 'Persistent Project', description: 'Test desc' });

    const retrieved = await manager.getProject(created.metadata.id);
    expect(retrieved.metadata.name).toBe('Persistent Project');
    expect(retrieved.metadata.description).toBe('Test desc');
    expect(retrieved.phases).toHaveLength(10);
  });

  it('lists projects sorted by updatedAt descending', async () => {
    const manager = ProjectManager.getInstance();
    await manager.createProject({ name: 'Alpha' });
    await manager.createProject({ name: 'Beta' });

    const projects = await manager.listProjects();
    expect(projects.length).toBeGreaterThanOrEqual(2);
    // Most recently created (Beta) should come first
    const names = projects.map((p) => p.name);
    expect(names.indexOf('Beta')).toBeLessThan(names.indexOf('Alpha'));
  });

  it('initializes all phases as not-started', async () => {
    const manager = ProjectManager.getInstance();
    const project = await manager.createProject({ name: 'Phase States' });

    for (const phaseState of project.phases) {
      expect(phaseState.status).toBe('not-started');
      expect(phaseState.artifactPaths).toEqual({});
      expect(phaseState.llmAssisted).toBe(false);
    }
  });

  it('deletes a project and removes it from the list', async () => {
    const manager = ProjectManager.getInstance();
    const project = await manager.createProject({ name: 'To Delete' });

    await manager.deleteProject(project.metadata.id);

    await expect(manager.getProject(project.metadata.id)).rejects.toThrow();
  });

  it('writes and reads artifacts correctly', async () => {
    const manager = ProjectManager.getInstance();
    const project = await manager.createProject({ name: 'Artifact Test' });

    const artifact = { schemaVersion: '1.0.0', generatedAt: new Date().toISOString(), flows: [] };
    const relativePath = await manager.writeArtifact(project.metadata.id, 'intentModel', artifact);

    const read = await manager.readArtifact<typeof artifact>(project.metadata.id, relativePath);
    expect(read.schemaVersion).toBe('1.0.0');
    expect(read.flows).toEqual([]);
  });
});
