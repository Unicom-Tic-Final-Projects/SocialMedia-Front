import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { API_BASE_URL } from '../../config/api.config';
import { LoggingService } from '../../core/services/logging.service';

export interface SearchRequest {
  query: string;
  type?: 'posts' | 'clients' | 'media' | 'social-accounts' | 'all';
  pageNumber?: number;
  pageSize?: number;
  filters?: Record<string, any>;
}

@Injectable({
  providedIn: 'root',
})
export class SearchService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly loggingService = inject(LoggingService);

  /**
   * Global search across all entities
   */
  globalSearch(request: SearchRequest): Observable<any> {
    let params = new HttpParams().set('query', request.query);
    if (request.type) params = params.set('type', request.type);
    if (request.pageNumber) params = params.set('pageNumber', request.pageNumber.toString());
    if (request.pageSize) params = params.set('pageSize', request.pageSize.toString());
    if (request.filters) {
      Object.keys(request.filters).forEach(key => {
        const value = request.filters![key];
        if (value !== undefined && value !== null) {
          params = params.set(`filters.${key}`, value.toString());
        }
      });
    }

    return this.http.get<any>(`${this.baseUrl}/api/search`, { params }).pipe(
      catchError((error) => {
        this.loggingService.error('Search failed', error, 'SearchService');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Search posts
   */
  searchPosts(query: string, filters?: any): Observable<any> {
    let params = new HttpParams().set('query', query);
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null) {
          params = params.set(key, filters[key].toString());
        }
      });
    }

    return this.http.get<any>(`${this.baseUrl}/api/search/posts`, { params }).pipe(
      catchError((error) => {
        this.loggingService.error('Post search failed', error, 'SearchService');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Search clients
   */
  searchClients(query: string): Observable<any> {
    const params = new HttpParams().set('query', query);
    return this.http.get<any>(`${this.baseUrl}/api/search/clients`, { params }).pipe(
      catchError((error) => {
        this.loggingService.error('Client search failed', error, 'SearchService');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Search media
   */
  searchMedia(query: string, filters?: any): Observable<any> {
    let params = new HttpParams().set('query', query);
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null) {
          params = params.set(key, filters[key].toString());
        }
      });
    }

    return this.http.get<any>(`${this.baseUrl}/api/search/media`, { params }).pipe(
      catchError((error) => {
        this.loggingService.error('Media search failed', error, 'SearchService');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Get search suggestions
   */
  getSearchSuggestions(query: string): Observable<string[]> {
    const params = new HttpParams().set('query', query);
    return this.http.get<string[]>(`${this.baseUrl}/api/search/suggestions`, { params }).pipe(
      catchError((error) => {
        this.loggingService.error('Failed to get search suggestions', error, 'SearchService');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Get recent searches
   */
  getRecentSearches(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/api/search/recent`).pipe(
      catchError((error) => {
        this.loggingService.error('Failed to get recent searches', error, 'SearchService');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Save search query
   */
  saveSearch(query: string, filters?: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/api/search/saved`, { query, filters }).pipe(
      catchError((error) => {
        this.loggingService.error('Failed to save search', error, 'SearchService');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Get saved searches
   */
  getSavedSearches(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/api/search/saved`).pipe(
      catchError((error) => {
        this.loggingService.error('Failed to get saved searches', error, 'SearchService');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Delete saved search
   */
  deleteSavedSearch(searchId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/api/search/saved/${searchId}`).pipe(
      catchError((error) => {
        this.loggingService.error('Failed to delete saved search', error, 'SearchService');
        return throwError(() => error);
      }),
    );
  }
}
