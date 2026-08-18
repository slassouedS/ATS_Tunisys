import { Routes } from '@angular/router';

export const TECHNIQUE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./technique-shell.component').then(m => m.TechniqueShellComponent),
    children: [
      { path: '', loadComponent: () => import('./dashboard/technique-dashboard.component').then(m => m.TechniqueDashboardComponent) },
      { path: 'shortlists', loadComponent: () => import('./shortlists/technique-shortlists.component').then(m => m.TechniqueShortlistsComponent) },
      { path: 'entretiens', loadComponent: () => import('./entretiens/technique-entretiens.component').then(m => m.TechniqueEntretiensComponent) },
      { path: 'historique', loadComponent: () => import('./historique/technique-historique.component').then(m => m.TechniqueHistoriqueComponent) },
    ],
  },
];
