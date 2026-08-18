import { Routes } from '@angular/router';

export const CANDIDAT_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./portail/portail-home.component').then(m => m.PortailHomeComponent) },
  { path: 'offre/:id', loadComponent: () => import('./portail/offer-apply.component').then(m => m.OfferApplyComponent) },
  { path: 'inscription', loadComponent: () => import('./portail/candidate-register.component').then(m => m.CandidateRegisterComponent) },
  { path: 'connexion', loadComponent: () => import('./portail/candidate-login.component').then(m => m.CandidateLoginComponent) },
  { path: 'mon-espace', loadComponent: () => import('./portail/espace-candidat.component').then(m => m.EspaceCandidatComponent) },
  { path: 'assessment/:token', loadComponent: () => import('./portail/assessment-take.component').then(m => m.AssessmentTakeComponent) },
];
