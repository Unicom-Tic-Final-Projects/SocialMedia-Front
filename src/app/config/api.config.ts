import { InjectionToken, Provider } from '@angular/core';

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');

export function provideApiBaseUrl(url?: string): Provider {
  // Check if we're in development mode (localhost)
  const isLocalhost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || 
     window.location.hostname === '127.0.0.1' ||
     window.location.hostname === '');

  const resolved =
    url ||
    (typeof window !== 'undefined' && (window as any).ENV?.API_BASE_URL) ||
    // Use localhost for local development, Azure URL for production
    (isLocalhost ? 'http://localhost:5000' : 'https://nexuspost-api-dev-896.azurewebsites.net');
  
  return { provide: API_BASE_URL, useValue: resolved };
}
