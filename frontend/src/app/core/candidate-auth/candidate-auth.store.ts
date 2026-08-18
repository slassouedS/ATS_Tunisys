import { Injectable, computed, signal } from '@angular/core';

const STORAGE_KEY = 'tunisys_candidate_auth';

export interface CandidateUser {
  email: string;
  firstName: string;
  lastName: string;
}

/** Store d'authentification candidat — separe du store staff (AuthStore) pour
 *  eviter tout risque de melange entre les deux systemes de compte. */
@Injectable({ providedIn: 'root' })
export class CandidateAuthStore {
  private readonly _candidate = signal<CandidateUser | null>(this.restore());
  private readonly _token = signal<string | null>(localStorage.getItem(`${STORAGE_KEY}_token`));

  readonly candidate = this._candidate.asReadonly();
  readonly token = this._token.asReadonly();
  readonly isAuthenticated = computed(() => this._token() !== null);
  readonly displayName = computed(() => {
    const c = this._candidate();
    return c ? `${c.firstName} ${c.lastName}` : '';
  });

  setSession(data: { accessToken: string; email: string; firstName: string; lastName: string }): void {
    const candidate: CandidateUser = { email: data.email, firstName: data.firstName, lastName: data.lastName };
    this._candidate.set(candidate);
    this._token.set(data.accessToken);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(candidate));
    localStorage.setItem(`${STORAGE_KEY}_token`, data.accessToken);
  }

  clear(): void {
    this._candidate.set(null);
    this._token.set(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(`${STORAGE_KEY}_token`);
  }

  private restore(): CandidateUser | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CandidateUser) : null;
  }
}
