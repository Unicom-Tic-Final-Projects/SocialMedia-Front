import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { API_BASE_URL } from '../../config/api.config';
import { LoggingService } from '../../core/services/logging.service';

export interface ImportRequest {
  entityType: 'posts' | 'clients' | 'social-accounts';
  file: File;
  options?: {
    skipDuplicates?: boolean;
    updateExisting?: boolean;
    mapping?: Record<string, string>;
  };
}

@Injectable({
  providedIn: 'root',
})
export class ImportService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly loggingService = inject(LoggingService);

  /**
   * Import posts from file
   */
  importPosts(file: File, options?: any): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    if (options) {
      formData.append('options', JSON.stringify(options));
    }

    return this.http.post<any>(`${this.baseUrl}/api/import/posts`, formData).pipe(
      catchError((error) => {
        this.loggingService.error('Failed to import posts', error, 'ImportService');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Import clients from file
   */
  importClients(file: File, options?: any): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    if (options) {
      formData.append('options', JSON.stringify(options));
    }

    return this.http.post<any>(`${this.baseUrl}/api/import/clients`, formData).pipe(
      catchError((error) => {
        this.loggingService.error('Failed to import clients', error, 'ImportService');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Import social accounts from file
   */
  importSocialAccounts(file: File, options?: any): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    if (options) {
      formData.append('options', JSON.stringify(options));
    }

    return this.http.post<any>(`${this.baseUrl}/api/import/social-accounts`, formData).pipe(
      catchError((error) => {
        this.loggingService.error('Failed to import social accounts', error, 'ImportService');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Get import template
   */
  getImportTemplate(entityType: 'posts' | 'clients' | 'social-accounts', format: 'csv' | 'xlsx' = 'csv'): Observable<Blob> {
    const params = new HttpParams()
      .set('entityType', entityType)
      .set('format', format);
    return this.http.get(`${this.baseUrl}/api/import/template`, { params, responseType: 'blob' }).pipe(
      catchError((error) => {
        this.loggingService.error('Failed to get import template', error, 'ImportService');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Validate import file
   */
  validateImportFile(file: File, entityType: string): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('entityType', entityType);

    return this.http.post<any>(`${this.baseUrl}/api/import/validate`, formData).pipe(
      catchError((error) => {
        this.loggingService.error('Failed to validate import file', error, 'ImportService');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Get import status
   */
  getImportStatus(importId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/api/import/status/${importId}`).pipe(
      catchError((error) => {
        this.loggingService.error('Failed to get import status', error, 'ImportService');
        return throwError(() => error);
      }),
    );
  }
}
