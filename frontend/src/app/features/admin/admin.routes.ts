import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./admin-shell.component').then(m => m.AdminShellComponent),
    children: [
      { path: '', loadComponent: () => import('./dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent) },
      { path: 'users', loadComponent: () => import('./users/user-list.component').then(m => m.UserListComponent) },
      { path: 'ia-config', loadComponent: () => import('./ia-config/admin-ia-config.component').then(m => m.AdminIaConfigComponent) },
      { path: 'logs', loadComponent: () => import('./logs/admin-logs.component').then(m => m.AdminLogsComponent) },
      { path: 'system', loadComponent: () => import('./system/admin-system.component').then(m => m.AdminSystemComponent) },
    ],
  },
];
