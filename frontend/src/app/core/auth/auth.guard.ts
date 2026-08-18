import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from './auth.store';

/**
 * Guard par rôle (Role-Based Lazy Loading — cf. feuille de route).
 * NB : ceci est une protection UX de premier niveau. La sécurité réelle est
 * appliquée côté backend (Spring Security @PreAuthorize) — ne jamais s'y fier seul.
 */
export function authGuard(requiredRole: string): CanActivateFn {
  return () => {
    const authStore = inject(AuthStore);
    const router = inject(Router);

    if (!authStore.isAuthenticated()) {
      router.navigate(['/login']);
      return false;
    }
    if (authStore.role() !== requiredRole) {
      router.navigate(['/login']);
      return false;
    }
    return true;
  };
}
