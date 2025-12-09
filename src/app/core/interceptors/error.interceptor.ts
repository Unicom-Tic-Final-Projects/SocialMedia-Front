import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError } from 'rxjs';
import { throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'An unknown error occurred';

      if (error.error instanceof ErrorEvent) {
        // Client-side error
        errorMessage = `Error: ${error.error.message}`;
      } else {
        // Server-side error
        if (error.error && typeof error.error === 'object') {
          // Handle validation errors from ASP.NET Core
          if (error.error.errors && typeof error.error.errors === 'object') {
            const validationErrors: string[] = [];
            for (const [key, value] of Object.entries(error.error.errors)) {
              if (Array.isArray(value)) {
                validationErrors.push(`${key}: ${value.join(', ')}`);
              } else if (typeof value === 'string') {
                validationErrors.push(`${key}: ${value}`);
              }
            }
            if (validationErrors.length > 0) {
              errorMessage = validationErrors.join('; ');
            }
          }
          
          // Handle ApiResponse format - check for message first
          if (!errorMessage && error.error.message) {
            errorMessage = error.error.message;
          } else if (!errorMessage && error.error.errors && Array.isArray(error.error.errors)) {
            errorMessage = error.error.errors.join(', ');
          } else if (!errorMessage && error.error.data && typeof error.error.data === 'string') {
            // Some errors might have data as a string message
            errorMessage = error.error.data;
          }
        } else if (typeof error.error === 'string') {
          // Error might be a plain string
          errorMessage = error.error;
        } else if (error.message) {
          errorMessage = error.message;
        }

        // Handle specific HTTP status codes
        switch (error.status) {
          case 400:
            errorMessage = errorMessage || 'Bad request. Please check your input.';
            break;
          case 401:
            // For login/register endpoints, use the error message from the API response
            // For other endpoints, use generic unauthorized message
            if (req.url.includes('/api/auth/login') || req.url.includes('/api/auth/register')) {
              errorMessage = errorMessage || 'Invalid email or password.';
            } else {
              errorMessage = errorMessage || 'Unauthorized. Please login again.';
            }
            break;
          case 403:
            errorMessage =
              errorMessage || 'Forbidden. You do not have permission to access this resource.';
            break;
          case 404:
            errorMessage = errorMessage || 'Resource not found.';
            break;
          case 500:
            errorMessage = errorMessage || 'Server error. Please try again later.';
            break;
          case 0:
            errorMessage = 'Network error. Please check your connection.';
            break;
        }
      }

      // Log detailed error information for debugging
      const errorDetails: any = {
        url: req.url,
        status: error.status,
        message: errorMessage,
        error: error.error,
        errorKeys:
          error.error && typeof error.error === 'object' ? Object.keys(error.error) : 'N/A',
      };

      // Log validation errors if present
      if (error.error?.errors && typeof error.error.errors === 'object') {
        errorDetails.validationErrors = error.error.errors;
        console.error('Validation Errors:', error.error.errors);
      }

      console.error('HTTP Error:', errorDetails);

      // You can inject a toast service here to show error messages
      // const toastService = inject(ToastService);
      // toastService.showError(errorMessage);

      return throwError(() => ({
        ...error,
        userMessage: errorMessage,
      }));
    }),
  );
};
