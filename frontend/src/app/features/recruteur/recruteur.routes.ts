import { Routes } from '@angular/router';

export const RECRUTEUR_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./recruteur-shell.component').then(m => m.RecruteurShellComponent),
    children: [
      { path: '', loadComponent: () => import('./dashboard/recruteur-dashboard.component').then(m => m.RecruteurDashboardComponent) },
      { path: 'candidatures', loadComponent: () => import('./applications/recruteur-applications.component').then(m => m.RecruteurApplicationsComponent) },
      { path: 'pipeline', loadComponent: () => import('./pipeline/kanban-pipeline.component').then(m => m.KanbanPipelineComponent) },
      { path: 'cvtheque', loadComponent: () => import('./cvtheque/cvtheque-search.component').then(m => m.CvthequeSearchComponent) },
      { path: 'assessment', loadComponent: () => import('./assessment/recruteur-assessment.component').then(m => m.RecruteurAssessmentComponent) },
      { path: 'agenda', loadComponent: () => import('./agenda/agenda.component').then(m => m.AgendaComponent) },
      { path: 'notifications', loadComponent: () => import('./notifications/recruteur-notifications.component').then(m => m.RecruteurNotificationsComponent) },
    ],
  },
];
