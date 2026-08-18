import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthStore } from './auth.store';
import { CandidateAuthStore } from '../candidate-auth/candidate-auth.store';

/** Ajoute le Bearer JWT sur toutes les requêtes API sortantes — jeton candidat
 *  pour les routes /api/candidate/**, jeton staff sinon. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const isCandidateRoute = req.url.includes('/api/candidate/');
  const token = isCandidateRoute
    ? inject(CandidateAuthStore).token()
    : inject(AuthStore).token();

  if (!token) return next(req);

  const cloned = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });
  return next(cloned);
};
