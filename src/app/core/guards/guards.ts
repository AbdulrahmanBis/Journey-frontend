import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn) return true;
  return router.createUrlTree(['/login']);
};

/** `allowed` is a list of role codes (see RoleCode in core/models/enums). */
export function roleGuard(allowed: readonly number[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (!auth.isLoggedIn) return router.createUrlTree(['/login']);
    if (auth.hasRole(...allowed)) return true;
    return router.createUrlTree(['/dashboard']);
  };
}

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn) return true;
  return router.createUrlTree(['/dashboard']);
};
