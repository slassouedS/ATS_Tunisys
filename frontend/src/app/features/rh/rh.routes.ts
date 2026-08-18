import { Routes } from '@angular/router';

export const RH_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./rh-shell.component').then(m => m.RhShellComponent),
    children: [
      { path: '', loadComponent: () => import('./dashboard/rh-dashboard.component').then(m => m.RhDashboardComponent) },
      { path: 'demandes', loadComponent: () => import('./demands/rh-demands.component').then(m => m.RhDemandsComponent) },
      { path: 'offres', loadComponent: () => import('./offers/rh-offers.component').then(m => m.RhOffersComponent) },
      { path: 'pipeline', loadComponent: () => import('./pipeline/rh-pipeline.component').then(m => m.RhPipelineComponent) },
      { path: 'decisions', loadComponent: () => import('./decisions/rh-decisions.component').then(m => m.RhDecisionsComponent) },
      { path: 'analytics', loadComponent: () => import('./analytics/rh-analytics.component').then(m => m.RhAnalyticsComponent) },
      { path: 'cvtheque', loadComponent: () => import('../recruteur/cvtheque/cvtheque-search.component').then(m => m.CvthequeSearchComponent) },
      {
        path: 'decisions/:id/grille-technique',
        loadComponent: () => import('../manager/entretiens/technical-evaluation-grid.component').then(m => m.TechnicalEvaluationGridComponent),
        data: { apiBase: '/rh', readOnly: true, backLink: '/rh/decisions' },
      },
    ],
  },
];
