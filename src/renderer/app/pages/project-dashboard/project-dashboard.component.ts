import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  inject,
  computed,
} from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { ProjectService } from '../../services/project.service';
import { PhaseService } from '../../services/phase.service';
import { PhaseId } from '../../../../shared/phase-descriptor';
import type { PhaseState } from '../../../../shared/project';
import type { PhaseDescriptor } from '../../../../shared/phase-descriptor';

interface PhaseSummary {
  descriptor: PhaseDescriptor;
  state: PhaseState;
}

@Component({
  selector: 'app-project-dashboard',
  standalone: true,
  imports: [TitleCasePipe],
  templateUrl: './project-dashboard.component.html',
  styleUrl: './project-dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectDashboardComponent implements OnInit {
  private readonly projectService = inject(ProjectService);
  private readonly phaseService = inject(PhaseService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly project = this.projectService.currentProject;

  protected readonly phaseSummaries = computed<PhaseSummary[]>(() => {
    const project = this.project();
    const descriptors = this.phaseService.descriptors();
    if (!project || descriptors.length === 0) return [];

    return descriptors.map((descriptor) => {
      const state = project.phases.find((p) => p.phaseId === descriptor.id) ?? {
        phaseId: descriptor.id,
        status: 'not-started' as const,
        artifactPaths: {},
        llmAssisted: false,
      };
      return { descriptor, state };
    });
  });

  async ngOnInit(): Promise<void> {
    const projectId = this.route.snapshot.paramMap.get('id');
    if (!projectId) {
      await this.router.navigate(['/welcome']);
      return;
    }
    // If we navigated here without the project already in memory, load it
    if (!this.project() || this.project()?.metadata.id !== projectId) {
      try {
        await this.projectService.openProject(projectId);
      } catch {
        await this.router.navigate(['/welcome']);
      }
    }
  }

  protected async navigateToPhase(phaseId: PhaseId): Promise<void> {
    const project = this.project();
    if (project) {
      await this.router.navigate(['/project', project.metadata.id, 'phase', phaseId]);
    }
  }

  protected getLLMLabel(descriptor: PhaseDescriptor): string {
    const map: Record<string, string> = {
      none: 'Deterministic',
      optional: 'AI Power Up',
      required: 'AI Required',
      partial: 'AI Partial',
    };
    return map[descriptor.llmUsage] ?? descriptor.llmUsage;
  }

  protected getStatusIcon(status: PhaseState['status']): string {
    const map: Record<PhaseState['status'], string> = {
      'not-started': '○',
      'in-progress': '◌',
      'completed': '●',
      'failed': '✕',
      'skipped': '—',
    };
    return map[status];
  }
}
