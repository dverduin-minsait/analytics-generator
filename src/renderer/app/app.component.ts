import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  inject,
  computed,
} from '@angular/core';
import { RouterOutlet, RouterLink, Router } from '@angular/router';
import { ThemeService, type Theme } from './services/theme.service';
import { ProjectService } from './services/project.service';
import { PhaseService } from './services/phase.service';
import { PhaseId } from '../../shared/phase-descriptor';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  protected readonly themeService = inject(ThemeService);
  protected readonly projectService = inject(ProjectService);
  protected readonly phaseService = inject(PhaseService);
  protected readonly router = inject(Router);

  protected readonly PhaseId = PhaseId;

  /** True when the user is inside a project (any project/:id route) */
  protected readonly inProject = computed(() => this.projectService.hasProject());

  protected readonly currentProject = computed(() => this.projectService.currentProject());

  protected readonly themeLabel = computed<string>(() => {
    const map: Record<Theme, string> = {
      light: '☀ Light',
      dark: '🌙 Dark',
      'high-contrast': '◑ High Contrast',
    };
    return map[this.themeService.currentTheme()];
  });

  async ngOnInit(): Promise<void> {
    // Pre-load phase descriptors so they are available throughout the session
    try {
      await this.phaseService.loadDescriptors();
    } catch {
      // App can still function without descriptors (they are re-loaded per phase screen)
    }
  }

  protected cycleTheme(): void {
    this.themeService.cycleTheme();
  }

  protected navigateToPhase(phaseId: number): void {
    const project = this.currentProject();
    if (project) {
      void this.router.navigate(['/project', project.metadata.id, 'phase', phaseId]);
    }
  }

  protected navigateToDashboard(): void {
    const project = this.currentProject();
    if (project) {
      void this.router.navigate(['/project', project.metadata.id]);
    }
  }
}
