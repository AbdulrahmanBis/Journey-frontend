import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/enums';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn) return true;
  return router.createUrlTree(['/login']);
};

export function roleGuard(allowed: UserRole[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (!auth.isLoggedIn) return router.createUrlTree(['/login']);
    if (allowed.includes(auth.currentUser!.role)) return true;
    return router.createUrlTree(['/dashboard']);
  };
}

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn) return true;
  return router.createUrlTree(['/dashboard']);
};
