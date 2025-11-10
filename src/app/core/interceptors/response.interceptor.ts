import { HttpInterceptorFn } from '@angular/common/http';
import { map } from 'rxjs';

/**
 * Interceptor to unwrap ApiResponse<T> structure from backend
 * Backend returns: { success: boolean, data: T, message?: string }
 * This interceptor extracts the data property for easier consumption
 */
export const responseInterceptor: HttpInterceptorFn = (req, next) => {
  // Skip unwrapping for certain endpoints if needed
  // For now, we'll unwrap all responses

  return next(req).pipe(
    map((response: any) => {
      // Check if response matches ApiResponse structure
      if (response && typeof response === 'object' && 'success' in response) {
        // If success is false, throw error (will be caught by error interceptor)
        if (!response.success) {
          throw response;
        }
        // Return the data directly for successful responses (if data exists)
        // Some endpoints might return success: true without data
        return 'data' in response ? response.data : response;
      }
      // If not ApiResponse format, return as-is
      return response;
    })
  );
};

