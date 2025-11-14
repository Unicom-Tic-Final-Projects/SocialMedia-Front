import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { provideApiBaseUrl } from './config/api.config';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { responseInterceptor } from './core/interceptors/response.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor, responseInterceptor, errorInterceptor])),
    provideApiBaseUrl()
  ]
};
