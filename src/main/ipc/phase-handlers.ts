import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import { PhaseRegistry } from '../phases/phase-registry';
import type { ExecutePhaseRequest, CancelPhaseRequest } from '../../shared/ipc-api';
import type { ProgressEvent } from '../../shared/phase-engine';

export function registerPhaseHandlers(): void {
  const registry = PhaseRegistry.getInstance();

  // ── Get all phase descriptors ─────────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.PHASE_GET_DESCRIPTORS, () => {
    return registry.getAllDescriptors();
  });

  // ── Start phase execution ─────────────────────────────────────────────────
  ipcMain.handle(
    IPC_CHANNELS.PHASE_EXECUTE,
    async (event, req: ExecutePhaseRequest) => {
      const engine = registry.getEngine(req.phaseId);
      if (!engine) {
        throw new Error(`No engine registered for phase ${req.phaseId}`);
      }

      const validation = engine.validate(req.input);
      if (!validation.valid) {
        throw new Error(
          `Invalid input: ${validation.errors.map((e) => e.message).join(', ')}`,
        );
      }

      const progressChannel = `${IPC_CHANNELS.PHASE_PROGRESS_EVENT}:${req.projectId}:${req.phaseId}`;
      const senderWindow = BrowserWindow.fromWebContents(event.sender);

      // Run the generator asynchronously; each yielded event is forwarded to
      // the renderer via the scoped channel.
      void (async () => {
        try {
          const generator = engine.execute(req.input, req.options);
          let result = await generator.next();
          while (!result.done) {
            const progressEvent: ProgressEvent = result.value;
            senderWindow?.webContents.send(progressChannel, progressEvent);
            result = await generator.next();
          }
        } catch (err) {
          const failedEvent: ProgressEvent = {
            type: 'failed',
            phaseId: req.phaseId,
            message: err instanceof Error ? err.message : String(err),
            timestamp: new Date().toISOString(),
            llmAssisted: false,
          };
          senderWindow?.webContents.send(progressChannel, failedEvent);
        }
      })();

      // Resolve immediately — progress comes back via events
    },
  );

  // ── Cancel phase ──────────────────────────────────────────────────────────
  ipcMain.handle(
    IPC_CHANNELS.PHASE_CANCEL,
    async (_event, req: CancelPhaseRequest) => {
      const engine = registry.getEngine(req.phaseId);
      if (engine) {
        await engine.cancel();
      }
    },
  );
}
