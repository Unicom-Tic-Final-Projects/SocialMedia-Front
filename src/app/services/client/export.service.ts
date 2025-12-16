import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { API_BASE_URL } from '../../config/api.config';
import { LoggingService } from '../../core/services/logging.service';

export interface ExportRequest {
  entityType: 'posts' | 'analytics' | 'clients' | 'social-accounts' | 'media';
  format: 'csv' | 'xlsx' | 'json' | 'pdf';
  filters?: Record<string, any>;
  fields?: string[];
}

@Injectable({
  providedIn: 'root',
})
export class ExportService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly loggingService = inject(LoggingService);

  /**
   * Export posts
   */
  exportPosts(request: ExportRequest): Observable<Blob> {
    let params = new HttpParams()
      .set('entityType', 'posts')
      .set('format', request.format);
    
    if (request.filters) {
      Object.keys(request.filters).forEach(key => {
        const value = request.filters![key];
        if (value !== undefined && value !== null) {
          params = params.set(`filters.${key}`, value.toString());
        }
      });
    }
    if (request.fields && request.fields.length > 0) {
      params = params.set('fields', request.fields.join(','));
    }

    return this.http.get(`${this.baseUrl}/api/export/posts`, { params, responseType: 'blob' }).pipe(
      catchError((error) => {
        this.loggingService.error('Failed to export posts', error, 'ExportService');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Export analytics data
   */
  exportAnalytics(request: ExportRequest): Observable<Blob> {
    let params = new HttpParams()
      .set('entityType', 'analytics')
      .set('format', request.format);
    
    if (request.filters) {
      Object.keys(request.filters).forEach(key => {
        const value = request.filters![key];
        if (value !== undefined && value !== null) {
          params = params.set(`filters.${key}`, value.toString());
        }
      });
    }
    if (request.fields && request.fields.length > 0) {
      params = params.set('fields', request.fields.join(','));
    }

    return this.http.get(`${this.baseUrl}/api/export/analytics`, { params, responseType: 'blob' }).pipe(
      catchError((error) => {
        this.loggingService.error('Failed to export analytics', error, 'ExportService');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Export clients
   */
  exportClients(request: ExportRequest): Observable<Blob> {
    let params = new HttpParams()
      .set('entityType', 'clients')
      .set('format', request.format);
    
    if (request.filters) {
      Object.keys(request.filters).forEach(key => {
        const value = request.filters![key];
        if (value !== undefined && value !== null) {
          params = params.set(`filters.${key}`, value.toString());
        }
      });
    }
    if (request.fields && request.fields.length > 0) {
      params = params.set('fields', request.fields.join(','));
    }

    return this.http.get(`${this.baseUrl}/api/export/clients`, { params, responseType: 'blob' }).pipe(
      catchError((error) => {
        this.loggingService.error('Failed to export clients', error, 'ExportService');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Export social accounts
   */
  exportSocialAccounts(request: ExportRequest): Observable<Blob> {
    let params = new HttpParams()
      .set('entityType', 'social-accounts')
      .set('format', request.format);
    
    if (request.filters) {
      Object.keys(request.filters).forEach(key => {
        const value = request.filters![key];
        if (value !== undefined && value !== null) {
          params = params.set(`filters.${key}`, value.toString());
        }
      });
    }
    if (request.fields && request.fields.length > 0) {
      params = params.set('fields', request.fields.join(','));
    }

    return this.http.get(`${this.baseUrl}/api/export/social-accounts`, { params, responseType: 'blob' }).pipe(
      catchError((error) => {
        this.loggingService.error('Failed to export social accounts', error, 'ExportService');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Generic export method
   */
  export(request: ExportRequest): Observable<Blob> {
    let params = new HttpParams()
      .set('entityType', request.entityType)
      .set('format', request.format);
    
    if (request.filters) {
      Object.keys(request.filters).forEach(key => {
        const value = request.filters![key];
        if (value !== undefined && value !== null) {
          params = params.set(`filters.${key}`, value.toString());
        }
      });
    }
    if (request.fields && request.fields.length > 0) {
      params = params.set('fields', request.fields.join(','));
    }

    return this.http.get(`${this.baseUrl}/api/export`, { params, responseType: 'blob' }).pipe(
      catchError((error) => {
        this.loggingService.error('Export failed', error, 'ExportService');
        return throwError(() => error);
      }),
    );
  }
}
