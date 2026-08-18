import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const APP_ROUTES: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent) },

  // Portail candidat public — aucun guard (Module 2 du CDC)
  { path: 'portail', loadChildren: () => import('./features/candidat/candidat.routes').then(m => m.CANDIDAT_ROUTES) },

  // Zones protégées par rôle (Role-Based Lazy Loading)
  {
    path: 'manager',
    canActivate: [authGuard('MANAGER')],
    loadChildren: () => import('./features/manager/manager.routes').then(m => m.MANAGER_ROUTES),
  },
  {
    path: 'rh',
    canActivate: [authGuard('RH')],
    loadChildren: () => import('./features/rh/rh.routes').then(m => m.RH_ROUTES),
  },
  {
    path: 'recruteur',
    canActivate: [authGuard('RECRUTEUR')],
    loadChildren: () => import('./features/recruteur/recruteur.routes').then(m => m.RECRUTEUR_ROUTES),
  },
  {
    path: 'technique',
    canActivate: [authGuard('TECH')],
    loadChildren: () => import('./features/technique/technique.routes').then(m => m.TECHNIQUE_ROUTES),
  },
  {
    path: 'admin',
    canActivate: [authGuard('ADMIN')],
    loadChildren: () => import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES),
  },

  { path: '**', redirectTo: '/login' },
];
