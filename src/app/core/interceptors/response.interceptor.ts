import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { filter, map } from 'rxjs';

/**
 * Interceptor to unwrap ApiResponse<T> structure from backend
 * Backend returns: { success: boolean, data: T, message?: string }
 * This interceptor extracts the data property for easier consumption
 */
export const responseInterceptor: HttpInterceptorFn = (req, next) => {
  // Skip unwrapping for auth endpoints - they need the full ApiResponse structure
  // Client user creation endpoint needs full ApiResponse to extract password from message
  // Client user access endpoint should be unwrapped to get AuthResponse
  const isAuthEndpoint = req.url.includes('/api/auth/login') || 
                         req.url.includes('/api/auth/register') || 
                         req.url.includes('/api/auth/refresh') ||
                         req.url.includes('/api/auth/logout') ||
                         (req.url.includes('/api/auth/client-user') && !req.url.includes('/access'));

  return next(req).pipe(
    // Filter for HttpResponse events only (ignore HttpSentEvent, HttpHeaderResponse, etc.)
    filter((event): event is HttpResponse<any> => event instanceof HttpResponse),
    map((response: HttpResponse<any>) => {
      // Skip processing for error responses (4xx, 5xx) - let error interceptor handle them
      if (response.status >= 400) {
        return response;
      }
      
      // Skip unwrapping for auth endpoints - return full ApiResponse structure
      if (isAuthEndpoint) {
        console.log('[ResponseInterceptor] Auth endpoint - returning full ApiResponse:', response.body);
        return response;
      }
      
      // Extract body from HttpResponse
      const body = response.body;
      
      // Log the raw response for debugging
      if (req.url.includes('/api/posts') || req.url.includes('/api/socialaccount') || req.url.includes('/api/ai')) {
        console.log('[ResponseInterceptor] Raw response body for', req.url, ':', body);
      }
      
      // Check if body matches ApiResponse structure
      // Backend returns: { success: boolean, data: T, message?: string }
      if (body && typeof body === 'object' && 'success' in body) {
        // If success is false, throw error (will be caught by error interceptor)
        if (!body.success) {
          if (req.url.includes('/api/posts') || req.url.includes('/api/socialaccount') || req.url.includes('/api/ai')) {
            console.error('[ResponseInterceptor] API returned success=false:', body);
          }
          // Create an error object that will be caught by error handler
          const error = new Error(body.message || body.Message || 'Request failed');
          (error as any).error = body;
          throw error;
        }
        // Return the data directly for successful responses (if data exists)
        // Some endpoints might return success: true without data
        if ('data' in body && body.data !== null && body.data !== undefined) {
          const data = body.data;
          if (req.url.includes('/api/posts') || req.url.includes('/api/socialaccount')) {
            console.log('[ResponseInterceptor] Unwrapped data:', data);
            console.log('[ResponseInterceptor] Data type:', typeof data);
            console.log('[ResponseInterceptor] Data keys:', data ? Object.keys(data) : 'null/undefined');
            console.log('[ResponseInterceptor] Is array?', Array.isArray(data));
            if (Array.isArray(data)) {
              console.log('[ResponseInterceptor] Array length:', data.length);
            }
          }
          // Return new HttpResponse with the unwrapped data as the body
          return response.clone({ body: data });
        }
        // If no data property, return the response as-is
        if (req.url.includes('/api/posts') || req.url.includes('/api/socialaccount')) {
          console.warn('[ResponseInterceptor] ApiResponse has no data property or data is null/undefined:', body);
        }
        return response;
      }
      // If not ApiResponse format, return as-is
      if (req.url.includes('/api/posts') || req.url.includes('/api/socialaccount')) {
        console.log('[ResponseInterceptor] Response is not ApiResponse format, returning as-is');
      }
      return response;
    })
  );
};

