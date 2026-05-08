import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import { LLMGateway } from '../services/llm-gateway';
import type { LLMSettings } from '../../shared/llm-config';
import type { LLMTestConnectionRequest } from '../../shared/ipc-api';

export function registerLLMHandlers(): void {
  const gateway = LLMGateway.getInstance();

  ipcMain.handle(IPC_CHANNELS.LLM_GET_SETTINGS, () => {
    return gateway.getSettings();
  });

  ipcMain.handle(
    IPC_CHANNELS.LLM_SAVE_SETTINGS,
    async (_event, settings: LLMSettings) => {
      await gateway.saveSettings(settings);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.LLM_TEST_CONNECTION,
    async (_event, req: LLMTestConnectionRequest) => {
      return gateway.testConnection(req.providerType);
    },
  );
}
