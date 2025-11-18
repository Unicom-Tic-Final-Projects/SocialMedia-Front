import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard that ensures the current user belongs to an agency tenant and is NOT a team member.
 * Team members (Editor/Admin) should use the /team dashboard instead.
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

  if (authService.isAgency()) {
    return true;
  }

  // Non-agency users are sent to their default dashboard
  router.navigate(['/dashboard']);
  return false;
};

