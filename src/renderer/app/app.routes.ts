import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/welcome',
    pathMatch: 'full',
  },
  {
    path: 'welcome',
    loadComponent: () =>
      import('./pages/welcome/welcome.component').then((m) => m.WelcomeComponent),
    title: 'Analytics Generator',
  },
  {
    path: 'project/:id',
    loadComponent: () =>
      import('./pages/project-dashboard/project-dashboard.component').then(
        (m) => m.ProjectDashboardComponent,
      ),
    title: 'Project Dashboard',
  },
  {
    path: 'project/:id/phase/1',
    loadComponent: () =>
      import('./pages/phases/intent-analysis/intent-analysis.component').then(
        (m) => m.IntentAnalysisComponent,
      ),
    title: 'Phase 1 — Intent Analysis',
  },
  // Phases 2-10 route to a shared stub until their screens are implemented
  {
    path: 'project/:id/phase/:phaseId',
    loadComponent: () =>
      import('./pages/phases/phase-stub/phase-stub.component').then(
        (m) => m.PhaseStubComponent,
      ),
  },
  {
    path: '**',
    redirectTo: '/welcome',
  },
];
