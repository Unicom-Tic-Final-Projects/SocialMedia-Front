import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard to protect admin routes
 * Checks if user is authenticated AND has admin role
 */
export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    // Not logged in, redirect to admin login
    router.navigate(['/admin/login'], {
      queryParams: { returnUrl: state.url }
    });
    return false;
  }

  // Check if user has admin role
  const user = authService.user();
  const isAdmin = user?.role?.toLowerCase().includes('admin') || 
                  user?.role?.toLowerCase() === 'owner' ||
                  user?.role?.toLowerCase() === 'administrator';

  if (!isAdmin) {
    // Not an admin, redirect to dashboard
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};

