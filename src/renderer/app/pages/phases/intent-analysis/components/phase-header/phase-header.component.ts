/**
 * PhaseHeaderComponent — reusable phase screen header.
 *
 * Displays:
 * - Phase number + name
 * - LLM usage badge (color-coded by usage type)
 * - PREMIUM badge if applicable
 * - Goal statement
 * - Optional progress bar (shown when executing)
 */
import {
  Component,
  ChangeDetectionStrategy,
  input,
} from '@angular/core';
import type { PhaseDescriptor } from '../../../../../../../shared/phase-descriptor';

@Component({
  selector: 'app-phase-header',
  standalone: true,
  imports: [],
  templateUrl: './phase-header.component.html',
  styleUrl: './phase-header.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhaseHeaderComponent {
  readonly descriptor = input.required<PhaseDescriptor>();
  readonly percentComplete = input<number | null>(null);
  readonly isExecuting = input<boolean>(false);

  protected get llmBadgeClass(): string {
    const map: Record<string, string> = {
      none: 'llm-badge--none',
      required: 'llm-badge--required',
      optional: 'llm-badge--optional',
      partial: 'llm-badge--partial',
    };
    return map[this.descriptor().llmUsage] ?? '';
  }

  protected get llmBadgeLabel(): string {
    const map: Record<string, string> = {
      none: 'Deterministic — No AI',
      required: 'AI Required',
      optional: 'AI Power Up Available',
      partial: 'AI Partial',
    };
    return map[this.descriptor().llmUsage] ?? this.descriptor().llmUsage;
  }
}
