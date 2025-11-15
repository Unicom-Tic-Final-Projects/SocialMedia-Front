import { InjectionToken, Provider } from '@angular/core';

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');

export function provideApiBaseUrl(url?: string): Provider {
  const resolved =
    url ||
    // @ts-ignore allow optional global at runtime
    (typeof window !== 'undefined' && (window as any).ENV?.API_BASE_URL) ||
    // Use HTTP for local development - API Gateway runs on HTTP port 5000 by default
    //'http://localhost:5000'; // API Gateway URL (HTTP by default, use HTTPS if gateway is configured for HTTPS)
    'https://nexuspost-api-dev-896.azurewebsites.net'
  return { provide: API_BASE_URL, useValue: resolved };
}


