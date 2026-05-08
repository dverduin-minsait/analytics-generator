import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  inject,
  computed,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PhaseService } from '../../../services/phase.service';
import { PhaseId } from '../../../../../shared/phase-descriptor';

@Component({
  selector: 'app-phase-stub',
  standalone: true,
  imports: [],
  template: `
    <div class="stub">
      @if (descriptor()) {
        <div class="stub__icon" aria-hidden="true">🚧</div>
        <h1 class="stub__title">Phase {{ descriptor()!.id }} — {{ descriptor()!.name }}</h1>
        <p class="stub__message">
          This phase is not yet implemented. It will be available in a future iteration.
        </p>
        <p class="stub__goal">{{ descriptor()!.goalStatement }}</p>
        <button class="stub__back" (click)="goBack()">← Back to Dashboard</button>
      }
    </div>
  `,
  styles: [`
    :host { display: flex; align-items: center; justify-content: center; height: 100%; }
    .stub { text-align: center; max-width: 480px; padding: var(--space-8); display: flex; flex-direction: column; align-items: center; gap: var(--space-4); }
    .stub__icon { font-size: 48px; }
    .stub__title { font-size: 20px; font-weight: 700; }
    .stub__message { color: var(--color-text-secondary); font-size: 14px; }
    .stub__goal { font-size: 13px; color: var(--color-text-muted); font-style: italic; }
    .stub__back { padding: var(--space-2) var(--space-4); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); cursor: pointer; font-size: 14px; color: var(--color-text-secondary); transition: background var(--transition-fast); }
    .stub__back:hover { background: var(--color-surface-raised); color: var(--color-text-primary); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhaseStubComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly phaseService = inject(PhaseService);

  protected readonly descriptor = computed(() => {
    const phaseId = Number(this.route.snapshot.paramMap.get('phaseId')) as PhaseId;
    return this.phaseService.getDescriptor(phaseId);
  });

  async ngOnInit(): Promise<void> {
    if (this.phaseService.descriptors().length === 0) {
      await this.phaseService.loadDescriptors();
    }
  }

  protected async goBack(): Promise<void> {
    const projectId = this.route.snapshot.paramMap.get('id');
    await this.router.navigate(['/project', projectId]);
  }
}
