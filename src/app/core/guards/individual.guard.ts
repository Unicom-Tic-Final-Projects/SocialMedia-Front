import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard that ensures the current user is an individual user (not an agency).
 * Agency users are redirected to the agency dashboard.
 * Team members are redirected to the team dashboard.
 */
export const individualGuard: CanActivateFn = (route, state) => {
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

  // Check if user is a team member (Editor or Admin in Agency tenant)
  const isTeamMember = user.tenantType === 'Agency' && (user.role === 'Editor' || user.role === 'Admin');
  if (isTeamMember) {
    // Team members should use the team dashboard
    router.navigate(['/team']);
    return false;
  }

  // If user is an agency owner, redirect to agency dashboard
  if (authService.isAgency()) {
    router.navigate(['/agency']);
    return false;
  }

  // Individual users can access the dashboard
  return true;
};

