import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { API_BASE_URL } from '../../config/api.config';
import { LoggingService } from '../../core/services/logging.service';

export interface PostTemplate {
  id?: string;
  name: string;
  content: string;
  platforms?: string[];
  mediaUrl?: string;
  category?: string;
}

@Injectable({
  providedIn: 'root',
})
export class TemplatesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly loggingService = inject(LoggingService);

  /**
   * Get all templates
   */
  getTemplates(): Observable<PostTemplate[]> {
    return this.http.get<PostTemplate[]>(`${this.baseUrl}/api/templates`).pipe(
      catchError((error) => {
        this.loggingService.error('Failed to load templates', error, 'TemplatesService');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Get template by ID
   */
  getTemplate(templateId: string): Observable<PostTemplate> {
    return this.http.get<PostTemplate>(`${this.baseUrl}/api/templates/${templateId}`).pipe(
      catchError((error) => {
        this.loggingService.error('Failed to load template', error, 'TemplatesService');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Create template
   */
  createTemplate(template: PostTemplate): Observable<PostTemplate> {
    return this.http.post<PostTemplate>(`${this.baseUrl}/api/templates`, template).pipe(
      catchError((error) => {
        this.loggingService.error('Failed to create template', error, 'TemplatesService');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Update template
   */
  updateTemplate(templateId: string, template: Partial<PostTemplate>): Observable<PostTemplate> {
    return this.http.put<PostTemplate>(`${this.baseUrl}/api/templates/${templateId}`, template).pipe(
      catchError((error) => {
        this.loggingService.error('Failed to update template', error, 'TemplatesService');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Delete template
   */
  deleteTemplate(templateId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/api/templates/${templateId}`).pipe(
      catchError((error) => {
        this.loggingService.error('Failed to delete template', error, 'TemplatesService');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: string): Observable<PostTemplate[]> {
    const params = new HttpParams().set('category', category);
    return this.http.get<PostTemplate[]>(`${this.baseUrl}/api/templates/category`, { params }).pipe(
      catchError((error) => {
        this.loggingService.error('Failed to load templates by category', error, 'TemplatesService');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Get template categories
   */
  getTemplateCategories(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/api/templates/categories`).pipe(
      catchError((error) => {
        this.loggingService.error('Failed to load template categories', error, 'TemplatesService');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Duplicate template
   */
  duplicateTemplate(templateId: string, newName?: string): Observable<PostTemplate> {
    const body = newName ? { name: newName } : {};
    return this.http.post<PostTemplate>(`${this.baseUrl}/api/templates/${templateId}/duplicate`, body).pipe(
      catchError((error) => {
        this.loggingService.error('Failed to duplicate template', error, 'TemplatesService');
        return throwError(() => error);
      }),
    );
  }
}
