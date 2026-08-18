import { Routes } from '@angular/router';

export const MANAGER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./manager-shell.component').then(m => m.ManagerShellComponent),
    children: [
      { path: '', loadComponent: () => import('./dashboard/manager-dashboard.component').then(m => m.ManagerDashboardComponent) },
      { path: 'nouvelle-demande', loadComponent: () => import('./demand/demand-create.component').then(m => m.DemandCreateComponent) },
      { path: 'entretiens-techniques', loadComponent: () => import('./entretiens/manager-entretiens-tech.component').then(m => m.ManagerEntretiensTechComponent) },
      {
        path: 'entretiens-techniques/:id/grille',
        loadComponent: () => import('./entretiens/technical-evaluation-grid.component').then(m => m.TechnicalEvaluationGridComponent),
        data: { apiBase: '/manager', readOnly: false, backLink: '/manager/entretiens-techniques' },
      },
    ],
  },
];
