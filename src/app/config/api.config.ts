import { InjectionToken, Provider } from '@angular/core';

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');

export function provideApiBaseUrl(url?: string): Provider {
  const resolved =
    url ||
    // @ts-ignore allow optional global at runtime
    (typeof window !== 'undefined' && (window as any).ENV?.API_BASE_URL) ||
    'http://localhost:5000'; // API Gateway URL
  return { provide: API_BASE_URL, useValue: resolved };
}


