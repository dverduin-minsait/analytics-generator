import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ProjectService } from '../../services/project.service';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './welcome.component.html',
  styleUrl: './welcome.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WelcomeComponent implements OnInit {
  private readonly projectService = inject(ProjectService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly recentProjects = this.projectService.recentProjects;
  protected readonly isLoading = this.projectService.isLoading;
  protected readonly error = this.projectService.error;
  protected readonly showCreateForm = signal(false);

  protected readonly createForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(80)]],
    description: ['', Validators.maxLength(200)],
  });

  async ngOnInit(): Promise<void> {
    await this.projectService.loadRecentProjects();
  }

  protected openCreateForm(): void {
    this.showCreateForm.set(true);
    this.createForm.reset();
  }

  protected closeCreateForm(): void {
    this.showCreateForm.set(false);
  }

  protected async submitCreate(): Promise<void> {
    if (this.createForm.invalid) return;

    const { name, description } = this.createForm.value;
    try {
      const project = await this.projectService.createProject({
        name: name!,
        description: description ?? undefined,
      });
      await this.router.navigate(['/project', project.metadata.id, 'phase', 1]);
    } catch {
      // Error is already set on projectService.error
    }
  }

  protected async openProject(projectId: string): Promise<void> {
    try {
      const project = await this.projectService.openProject(projectId);
      await this.router.navigate(['/project', project.metadata.id]);
    } catch {
      // Error is already set on projectService.error
    }
  }
}
