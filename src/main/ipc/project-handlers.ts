import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import { ProjectManager } from '../services/project-manager';
import type { CreateProjectRequest, DeleteProjectRequest, OpenProjectRequest } from '../../shared/ipc-api';

export function registerProjectHandlers(): void {
  const manager = ProjectManager.getInstance();

  ipcMain.handle(IPC_CHANNELS.PROJECT_CREATE, async (_event, req: CreateProjectRequest) => {
    return manager.createProject(req);
  });

  ipcMain.handle(IPC_CHANNELS.PROJECT_OPEN, async (_event, req: OpenProjectRequest) => {
    return manager.getProject(req.projectId);
  });

  ipcMain.handle(IPC_CHANNELS.PROJECT_LIST, async () => {
    return manager.listProjects();
  });

  ipcMain.handle(IPC_CHANNELS.PROJECT_GET, async (_event, projectId: string) => {
    return manager.getProject(projectId);
  });

  ipcMain.handle(IPC_CHANNELS.PROJECT_SAVE, async (_event, project) => {
    return manager.saveProject(project);
  });

  ipcMain.handle(IPC_CHANNELS.PROJECT_DELETE, async (_event, req: DeleteProjectRequest) => {
    return manager.deleteProject(req.projectId);
  });
}
