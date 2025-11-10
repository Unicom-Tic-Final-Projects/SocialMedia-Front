import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

const TOKEN_KEY = 'access_token';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  // Skip auth for login/register endpoints
  if (req.url.includes('/api/auth/login') || req.url.includes('/api/auth/register')) {
    return next(req);
  }

  // Get token from storage
  const token = localStorage.getItem(TOKEN_KEY);

  // Clone request and add authorization header
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  // Handle response
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Handle 401 Unauthorized
      if (error.status === 401) {
        // Try to refresh token
        return authService.refreshToken().pipe(
          switchMap((response) => {
            if (response.success && response.data) {
              // Retry original request with new token
              const newToken = response.data.accessToken;
              const clonedReq = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${newToken}`
                }
              });
              return next(clonedReq);
            } else {
              // Refresh failed, redirect to login
              authService.logout();
              router.navigate(['/auth/login']);
              return throwError(() => error);
            }
          }),
          catchError((refreshError) => {
            // Refresh token failed, logout and redirect
            authService.logout();
            router.navigate(['/auth/login']);
            return throwError(() => refreshError);
          })
        );
      }

      // For other errors, just pass through
      return throwError(() => error);
    })
  );
};

