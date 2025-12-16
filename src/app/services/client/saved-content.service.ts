import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, tap, throwError } from 'rxjs';
import { API_BASE_URL } from '../../config/api.config';
import { LoggingService } from '../../core/services/logging.service';
import { GenerateContentPlanResponse } from './ai.service';

export interface SavedCaption {
  id: string;
  contentType: 'Caption';
  contentData: string; // JSON string
  parsedContent?: {
    caption: string;
    hashtags: string[];
  };
  title?: string;
  description?: string;
  tags?: string;
  savedAt: string;
  lastUsedAt?: string;
  usageCount: number;
}

export interface SavedContentPlan {
  id: string;
  contentType: 'ContentPlan';
  contentData: string; // JSON string
  parsedContent?: GenerateContentPlanResponse;
  title?: string;
  description?: string;
  tags?: string;
  savedAt: string;
  lastUsedAt?: string;
  usageCount: number;
}

export interface SaveCaptionRequest {
  caption: string;
  hashtags: string[];
  title?: string;
  description?: string;
  tags?: string;
  clientId?: string;
}

export interface SaveContentPlanRequest {
  contentPlan: GenerateContentPlanResponse;
  title?: string;
  description?: string;
  tags?: string;
  clientId?: string;
}

@Injectable({
  providedIn: 'root',
})
export class SavedContentService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly loggingService = inject(LoggingService);

  private readonly savedCaptionsSignal = signal<SavedCaption[]>([]);
  readonly savedCaptions = this.savedCaptionsSignal.asReadonly();

  private readonly savedContentPlansSignal = signal<SavedContentPlan[]>([]);
  readonly savedContentPlans = this.savedContentPlansSignal.asReadonly();

  private readonly loadingSignal = signal(false);
  readonly loading = this.loadingSignal.asReadonly();

  /**
   * Save a caption
   */
  saveCaption(request: SaveCaptionRequest): Observable<SavedCaption> {
    this.loadingSignal.set(true);
    return this.http.post<{ data: SavedCaption } | SavedCaption>(`${this.baseUrl}/api/ai/saved-content/captions`, request).pipe(
      map((response) => {
        const saved = 'data' in response ? response.data : response;
        // Parse content data
        return {
          ...saved,
          parsedContent: typeof saved.contentData === 'string' 
            ? JSON.parse(saved.contentData) 
            : saved.contentData,
        };
      }),
      tap((parsed) => {
        this.savedCaptionsSignal.update((list) => [parsed, ...list]);
        this.loadingSignal.set(false);
      }),
      catchError((error) => {
        this.loadingSignal.set(false);
        this.loggingService.error('Failed to save caption', error, 'SavedContentService');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Save a content plan
   */
  saveContentPlan(request: SaveContentPlanRequest): Observable<SavedContentPlan> {
    this.loadingSignal.set(true);
    return this.http.post<{ data: SavedContentPlan } | SavedContentPlan>(`${this.baseUrl}/api/ai/saved-content/content-plans`, request).pipe(
      map((response) => {
        const saved = 'data' in response ? response.data : response;
        // Parse content data
        return {
          ...saved,
          parsedContent: typeof saved.contentData === 'string' 
            ? JSON.parse(saved.contentData) 
            : saved.contentData,
        };
      }),
      tap((parsed) => {
        this.savedContentPlansSignal.update((list) => [parsed, ...list]);
        this.loadingSignal.set(false);
      }),
      catchError((error) => {
        this.loadingSignal.set(false);
        this.loggingService.error('Failed to save content plan', error, 'SavedContentService');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Load saved captions
   */
  loadSavedCaptions(clientId?: string): Observable<SavedCaption[]> {
    this.loadingSignal.set(true);
    let params = new HttpParams();
    if (clientId) {
      params = params.set('clientId', clientId);
    }
    return this.http.get<{ data: SavedCaption[] } | SavedCaption[]>(`${this.baseUrl}/api/ai/saved-content/captions`, { params }).pipe(
      map((response) => {
        const captions = Array.isArray(response) ? response : (response.data || []);
        // Parse content data for each caption
        return captions.map((caption: any) => ({
          ...caption,
          parsedContent: typeof caption.contentData === 'string' 
            ? JSON.parse(caption.contentData) 
            : caption.contentData,
        }));
      }),
      tap((parsed) => {
        this.savedCaptionsSignal.set(parsed);
        this.loadingSignal.set(false);
      }),
      catchError((error) => {
        this.loadingSignal.set(false);
        this.loggingService.error('Failed to load saved captions', error, 'SavedContentService');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Load saved content plans
   */
  loadSavedContentPlans(clientId?: string): Observable<SavedContentPlan[]> {
    this.loadingSignal.set(true);
    let params = new HttpParams();
    if (clientId) {
      params = params.set('clientId', clientId);
    }
    return this.http.get<{ data: SavedContentPlan[] } | SavedContentPlan[]>(`${this.baseUrl}/api/ai/saved-content/content-plans`, { params }).pipe(
      map((response) => {
        const plans = Array.isArray(response) ? response : (response.data || []);
        // Parse content data for each plan
        return plans.map((plan: any) => ({
          ...plan,
          parsedContent: typeof plan.contentData === 'string' 
            ? JSON.parse(plan.contentData) 
            : plan.contentData,
        }));
      }),
      tap((parsed) => {
        this.savedContentPlansSignal.set(parsed);
        this.loadingSignal.set(false);
      }),
      catchError((error) => {
        this.loadingSignal.set(false);
        this.loggingService.error('Failed to load saved content plans', error, 'SavedContentService');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Delete saved content
   */
  deleteSavedContent(id: string): Observable<boolean> {
    return this.http.delete<boolean>(`${this.baseUrl}/api/ai/saved-content/${id}`).pipe(
      tap(() => {
        this.savedCaptionsSignal.update((list) => list.filter((item) => item.id !== id));
        this.savedContentPlansSignal.update((list) => list.filter((item) => item.id !== id));
      }),
      catchError((error) => {
        this.loggingService.error('Failed to delete saved content', error, 'SavedContentService');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Use saved content (increments usage count)
   */
  useSavedContent(id: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/api/ai/saved-content/${id}/use`, {}).pipe(
      catchError((error) => {
        this.loggingService.error('Failed to mark content as used', error, 'SavedContentService');
        return throwError(() => error);
      }),
    );
  }
}

