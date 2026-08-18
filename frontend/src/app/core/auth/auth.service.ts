import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginResponse } from '../../shared/models/user.model';
import { AuthStore } from './auth.store';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiBaseUrl}/auth/login`, { email, password })
      .pipe(tap((res) => this.authStore.setSession(res)));
  }

  logout(): void {
    this.authStore.clear();
    this.router.navigate(['/login']);
  }

  /** Redirige vers l'espace correspondant au rôle après connexion. */
  redirectAfterLogin(): void {
    const role = this.authStore.role();
    const routeByRole: Record<string, string> = {
      MANAGER: '/manager',
      RH: '/rh',
      RECRUTEUR: '/recruteur',
      TECH: '/technique',
      ADMIN: '/admin',
    };
    this.router.navigate([role ? routeByRole[role] : '/login']);
  }
}
