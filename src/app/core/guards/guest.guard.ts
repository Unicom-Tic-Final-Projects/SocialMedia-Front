import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';

/**
 * Guard to prevent authenticated users from accessing auth pages (login/register)
 * Redirects to dashboard if user is already logged in
 */
export const guestGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token = localStorage.getItem('access_token');

  if (!token) {
    return true;
  }

  router.navigate(['/dashboard']);
  return false;
};
