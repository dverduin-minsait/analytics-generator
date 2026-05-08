/**
 * ExecutionPanelComponent — live phase execution log.
 *
 * Displays a scrollable list of ProgressEvents as they arrive.
 * Shows a cancel button while executing.
 * Announces key state changes to screen readers via ARIA live region.
 */
import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
  effect,
  AfterViewChecked,
  ElementRef,
  ViewChild,
} from '@angular/core';
import type { ProgressEvent } from '../../../../../../../shared/phase-engine';
import type { ExecutionState } from '../../../../../services/phase.service';

@Component({
  selector: 'app-execution-panel',
  standalone: true,
  imports: [],
  templateUrl: './execution-panel.component.html',
  styleUrl: './execution-panel.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExecutionPanelComponent implements AfterViewChecked {
  readonly events = input<ProgressEvent[]>([]);
  readonly executionState = input<ExecutionState>('idle');
  readonly cancel = output<void>();

  @ViewChild('logContainer') private logContainer?: ElementRef<HTMLElement>;

  private shouldScrollToBottom = false;

  constructor() {
    // Schedule a bottom-scroll whenever the events list grows
    effect(() => {
      const count = this.events().length;
      if (count > 0) {
        this.shouldScrollToBottom = true;
      }
    });
  }

  protected readonly isExecuting = computed(() => this.executionState() === 'executing');
  protected readonly isCompleted = computed(() => this.executionState() === 'completed');
  protected readonly hasFailed = computed(() => this.executionState() === 'failed');
  protected readonly isVisible = computed(
    () => this.events().length > 0 || this.isExecuting(),
  );

  protected readonly statusMessage = computed<string>(() => {
    const state = this.executionState();
    const map: Record<ExecutionState, string> = {
      idle: '',
      executing: 'Running…',
      completed: 'Completed successfully',
      failed: 'Failed',
      cancelled: 'Cancelled',
    };
    return map[state];
  });

  // Auto-scroll the log to the bottom when new events arrive
  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom && this.logContainer) {
      const el = this.logContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
      this.shouldScrollToBottom = false;
    }
  }

  protected getEventClass(event: ProgressEvent): string {
    const map: Partial<Record<ProgressEvent['type'], string>> = {
      completed: 'event--completed',
      failed: 'event--failed',
      warning: 'event--warning',
      cancelled: 'event--cancelled',
    };
    return map[event.type] ?? '';
  }

  protected getEventIcon(event: ProgressEvent): string {
    const map: Partial<Record<ProgressEvent['type'], string>> = {
      started: '▶',
      progress: '·',
      completed: '✓',
      failed: '✕',
      warning: '⚠',
      cancelled: '◼',
    };
    return map[event.type] ?? '·';
  }

  protected onCancelClick(): void {
    this.cancel.emit();
  }

  protected formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }
}
