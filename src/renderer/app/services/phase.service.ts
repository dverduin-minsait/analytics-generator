import { Injectable, signal, computed } from '@angular/core';
import type { PhaseDescriptor } from '../../../shared/phase-descriptor';
import { PhaseId } from '../../../shared/phase-descriptor';
import type { ProgressEvent, ExecutionOptions } from '../../../shared/phase-engine';
import type { ExecutePhaseRequest } from '../../../shared/ipc-api';
import { ElectronService } from './electron.service';

export type ExecutionState = 'idle' | 'executing' | 'completed' | 'failed' | 'cancelled';

@Injectable({ providedIn: 'root' })
export class PhaseService {
  // ── Descriptor catalog (loaded once on app start) ─────────────────────────
  readonly descriptors = signal<PhaseDescriptor[]>([]);

  // ── Execution state ───────────────────────────────────────────────────────
  readonly executionState = signal<ExecutionState>('idle');
  readonly progressEvents = signal<ProgressEvent[]>([]);
  readonly percentComplete = signal<number>(0);
  readonly currentPhaseId = signal<PhaseId | null>(null);

  // ── Computed ──────────────────────────────────────────────────────────────
  readonly isExecuting = computed(() => this.executionState() === 'executing');
  readonly isCompleted = computed(() => this.executionState() === 'completed');
  readonly hasFailed = computed(() => this.executionState() === 'failed');
  readonly latestMessage = computed(() => {
    const events = this.progressEvents();
    return events.length > 0 ? events[events.length - 1].message : null;
  });

  private unsubscribeProgress: (() => void) | null = null;

  constructor(private readonly electron: ElectronService) {}

  // ── Descriptor loading ────────────────────────────────────────────────────

  async loadDescriptors(): Promise<void> {
    const descriptors = await this.electron.phase.getDescriptors();
    this.descriptors.set(descriptors);
  }

  getDescriptor(phaseId: PhaseId): PhaseDescriptor | undefined {
    return this.descriptors().find((d) => d.id === phaseId);
  }

  // ── Execution ─────────────────────────────────────────────────────────────

  async execute(
    projectId: string,
    phaseId: PhaseId,
    input: unknown,
    options: ExecutionOptions,
  ): Promise<void> {
    // Clean up any previous subscription
    this.unsubscribeProgress?.();

    this.executionState.set('executing');
    this.progressEvents.set([]);
    this.percentComplete.set(0);
    this.currentPhaseId.set(phaseId);

    // Subscribe to progress events before starting execution
    this.unsubscribeProgress = this.electron.onPhaseProgress(
      projectId,
      phaseId,
      (event: ProgressEvent) => {
        this.progressEvents.update((events) => [...events, event]);

        if (event.percentComplete != null) {
          this.percentComplete.set(event.percentComplete);
        }

        if (event.type === 'completed') {
          this.executionState.set('completed');
        } else if (event.type === 'failed') {
          this.executionState.set('failed');
        } else if (event.type === 'cancelled') {
          this.executionState.set('cancelled');
        }
      },
    );

    const req: ExecutePhaseRequest = { projectId, phaseId, input, options };
    await this.electron.phase.execute(req);
  }

  async cancel(projectId: string, phaseId: PhaseId): Promise<void> {
    await this.electron.phase.cancel({ projectId, phaseId });
  }

  resetExecution(): void {
    this.unsubscribeProgress?.();
    this.unsubscribeProgress = null;
    this.executionState.set('idle');
    this.progressEvents.set([]);
    this.percentComplete.set(0);
    this.currentPhaseId.set(null);
  }
}
