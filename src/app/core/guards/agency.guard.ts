import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard that ensures the current user belongs to an agency tenant.
 * Redirects unauthenticated users to login and individual users to the standard dashboard.
 */
export const agencyGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    router.navigate(['/auth/login'], {
      queryParams: { returnUrl: state.url }
    });
    return false;
  }

  if (authService.isAgency()) {
    return true;
  }

  // Non-agency users are sent to their default dashboard
  router.navigate(['/dashboard']);
  return false;
};

