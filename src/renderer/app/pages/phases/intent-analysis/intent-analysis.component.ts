/**
 * IntentAnalysisComponent — Phase 1 screen (reference implementation).
 *
 * This component is the canonical example of how every phase screen is built:
 *   1. Phase header with LLM badge + progress bar
 *   2. Input section (file selection)
 *   3. Optional LLM configuration (POWER UP toggle — shown for optional phases)
 *   4. Execution panel (live log)
 *   5. Output preview (artifact rendered after completion)
 *   6. Navigation: Cancel returns to dashboard; Proceed navigates to Phase 2
 *
 * State machine: idle → executing → completed | failed | cancelled
 */

import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { PhaseService } from '../../../services/phase.service';
import { ProjectService } from '../../../services/project.service';
import { PhaseId } from '../../../../../shared/phase-descriptor';
import type { IntentModel } from '../../../../../shared/artifacts';
import { PhaseHeaderComponent } from './components/phase-header/phase-header.component';
import { FileInputComponent, type SelectedFile } from './components/file-input/file-input.component';
import { ExecutionPanelComponent } from './components/execution-panel/execution-panel.component';
import { OutputPreviewComponent } from './components/output-preview/output-preview.component';
import { ManualLlmInputComponent } from './components/manual-llm-input/manual-llm-input.component';

type AnalysisMode = 'auto' | 'manual';

@Component({
  selector: 'app-intent-analysis',
  standalone: true,
  imports: [
    PhaseHeaderComponent,
    FileInputComponent,
    ExecutionPanelComponent,
    OutputPreviewComponent,
    ManualLlmInputComponent,
  ],
  templateUrl: './intent-analysis.component.html',
  styleUrl: './intent-analysis.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IntentAnalysisComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly phaseService = inject(PhaseService);
  protected readonly projectService = inject(ProjectService);

  protected readonly PhaseId = PhaseId;

  // ── Component state ──────────────────────────────────────────────────────
  protected readonly selectedFiles = signal<SelectedFile[]>([]);
  protected readonly intentModel = signal<IntentModel | null>(null);
  protected readonly mode = signal<AnalysisMode>('auto');

  // ── Derived from PhaseService ─────────────────────────────────────────────
  protected readonly descriptor = computed(() =>
    this.phaseService.getDescriptor(PhaseId.IntentAnalysis),
  );
  protected readonly executionState = this.phaseService.executionState;
  protected readonly progressEvents = this.phaseService.progressEvents;
  protected readonly percentComplete = this.phaseService.percentComplete;
  protected readonly isExecuting = this.phaseService.isExecuting;
  protected readonly isCompleted = this.phaseService.isCompleted;
  protected readonly hasFailed = this.phaseService.hasFailed;

  // ── Computed UI state ─────────────────────────────────────────────────────
  protected readonly canExecute = computed(
    () => this.selectedFiles().length > 0 && this.executionState() === 'idle',
  );

  protected readonly canProceed = computed(
    () => this.isCompleted() && this.intentModel() !== null,
  );

  private get projectId(): string {
    return this.route.snapshot.paramMap.get('id') ?? '';
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  async ngOnInit(): Promise<void> {
    if (!this.projectId) {
      await this.router.navigate(['/welcome']);
      return;
    }

    if (this.phaseService.descriptors().length === 0) {
      await this.phaseService.loadDescriptors();
    }

    // Load project if not already in memory
    if (!this.projectService.currentProject()) {
      try {
        await this.projectService.openProject(this.projectId);
      } catch {
        await this.router.navigate(['/welcome']);
      }
    }

    // Restore previous execution state if already completed
    this.restoreCompletedArtifact();
  }

  ngOnDestroy(): void {
    // Do NOT reset execution here — the user may navigate away and back
  }

  // ── Event handlers ────────────────────────────────────────────────────────

  protected onFilesChanged(files: SelectedFile[]): void {
    this.selectedFiles.set(files);
  }

  protected setMode(m: AnalysisMode): void {
    this.mode.set(m);
  }

  protected async execute(): Promise<void> {
    if (!this.canExecute()) return;

    this.intentModel.set(null);

    await this.phaseService.execute(
      this.projectId,
      PhaseId.IntentAnalysis,
      { filePaths: this.selectedFiles().map((f) => f.path) },
      { useLLM: true, dryRun: false },
    );

    this.watchForCompletion();
  }

  protected async executeManual(rawJson: string): Promise<void> {
    if (this.executionState() !== 'idle') return;

    this.intentModel.set(null);

    await this.phaseService.execute(
      this.projectId,
      PhaseId.IntentAnalysis,
      { filePaths: this.selectedFiles().map((f) => f.path) },
      { useLLM: false, dryRun: false, manualLLMResponse: rawJson },
    );

    this.watchForCompletion();
  }

  protected async cancel(): Promise<void> {
    await this.phaseService.cancel(this.projectId, PhaseId.IntentAnalysis);
  }

  protected resetAndRetry(): void {
    this.phaseService.resetExecution();
    this.intentModel.set(null);
  }

  protected async navigateToDashboard(): Promise<void> {
    await this.router.navigate(['/project', this.projectId]);
  }

  protected async proceedToNextPhase(): Promise<void> {
    await this.router.navigate(['/project', this.projectId, 'phase', PhaseId.RepositoryAnalysis]);
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private watchForCompletion(): void {
    // The PhaseService.executionState signal transitions to 'completed' when
    // the completed ProgressEvent arrives. We read the artifact from the last
    // progress event's detail field (set by the IPC handler).
    const interval = setInterval(() => {
      if (this.isCompleted()) {
        const completedEvent = this.progressEvents().find((e) => e.type === 'completed');
        if (completedEvent?.detail) {
          this.intentModel.set(completedEvent.detail as IntentModel);
        }
        clearInterval(interval);
      } else if (this.hasFailed() || this.executionState() === 'cancelled') {
        clearInterval(interval);
      }
    }, 100);
  }

  private restoreCompletedArtifact(): void {
    if (this.isCompleted()) {
      const completedEvent = this.progressEvents().find((e) => e.type === 'completed');
      if (completedEvent?.detail) {
        this.intentModel.set(completedEvent.detail as IntentModel);
      }
    }
  }
}
