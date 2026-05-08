/**
 * OutputPreviewComponent — renders the IntentModel output from Phase 1.
 *
 * Shows:
 * - A summary card (total flows, total events, LLM-assisted marker)
 * - Expandable flow cards with their events
 * - Visual distinction for LLM-assisted vs explicit items
 */
import {
  Component,
  ChangeDetectionStrategy,
  input,
  signal,
  computed,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import type { IntentModel, IntentFlow } from '../../../../../../../shared/artifacts';

@Component({
  selector: 'app-output-preview',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './output-preview.component.html',
  styleUrl: './output-preview.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OutputPreviewComponent {
  readonly intentModel = input.required<IntentModel>();
  readonly expandedFlowIds = signal<Set<string>>(new Set());

  protected readonly totalEvents = computed(() => {
    const model = this.intentModel();
    const flowEvents = model.flows.reduce((sum, f) => sum + f.events.length, 0);
    return flowEvents + model.globalEvents.length;
  });

  protected isFlowExpanded(flowId: string): boolean {
    return this.expandedFlowIds().has(flowId);
  }

  protected toggleFlow(flowId: string): void {
    this.expandedFlowIds.update((ids) => {
      const next = new Set(ids);
      if (next.has(flowId)) {
        next.delete(flowId);
      } else {
        next.add(flowId);
      }
      return next;
    });
  }

  protected getConfidenceClass(confidence: number): string {
    if (confidence >= 0.8) return 'confidence--high';
    if (confidence >= 0.5) return 'confidence--medium';
    return 'confidence--low';
  }

  protected expandAll(): void {
    const ids = new Set(this.intentModel().flows.map((f) => f.id));
    this.expandedFlowIds.set(ids);
  }

  protected collapseAll(): void {
    this.expandedFlowIds.set(new Set());
  }

  protected trackByFlow(_: number, flow: IntentFlow): string {
    return flow.id;
  }
}
