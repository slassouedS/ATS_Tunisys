import { Injectable, computed, signal } from '@angular/core';
import { AuthUser, LoginResponse } from '../../shared/models/user.model';

const STORAGE_KEY = 'tunisys_auth';

/**
 * Store d'authentification (Signals). Le token est gardé en mémoire + localStorage
 * (acceptable pour ce contexte interne ; passer à un cookie httpOnly si l'exposition
 * publique du portail candidat authentifié devait un jour se durcir davantage).
 */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly _user = signal<AuthUser | null>(this.restoreUser());
  private readonly _token = signal<string | null>(localStorage.getItem(`${STORAGE_KEY}_token`));

  readonly user = this._user.asReadonly();
  readonly token = this._token.asReadonly();
  readonly isAuthenticated = computed(() => this._token() !== null);
  readonly role = computed(() => this._user()?.role ?? null);
  readonly displayName = computed(() => {
    const u = this._user();
    return u ? `${u.firstName} ${u.lastName}` : '';
  });
  readonly avatarInitials = computed(() => {
    const u = this._user();
    return u ? `${u.firstName[0] ?? ''}${u.lastName[0] ?? ''}`.toUpperCase() : '';
  });

  setSession(response: LoginResponse): void {
    const user: AuthUser = {
      email: response.email,
      role: response.role,
      firstName: response.firstName,
      lastName: response.lastName,
    };
    this._user.set(user);
    this._token.set(response.accessToken);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    localStorage.setItem(`${STORAGE_KEY}_token`, response.accessToken);
  }

  clear(): void {
    this._user.set(null);
    this._token.set(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(`${STORAGE_KEY}_token`);
  }

  private restoreUser(): AuthUser | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  }
}
