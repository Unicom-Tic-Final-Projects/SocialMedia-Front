import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard that ensures the current user is a team member (Editor or Admin role)
 * Team members should not have full agency access
 */
export const teamMemberGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    router.navigate(['/auth/login'], {
      queryParams: { returnUrl: state.url }
    });
    return false;
  }

  const user = authService.user();
  if (!user) {
    router.navigate(['/auth/login']);
    return false;
  }

  // Check if user is a team member (Editor or Admin) in an Agency tenant
  // Team members have roles: Editor or Admin, but are not the original agency owner
  if (user.tenantType === 'Agency' && (user.role === 'Editor' || user.role === 'Admin')) {
    return true;
  }

  // Non-team members are sent to their appropriate dashboard
  if (user.tenantType === 'Agency') {
    router.navigate(['/agency']);
  } else {
    router.navigate(['/dashboard']);
  }
  return false;
};

