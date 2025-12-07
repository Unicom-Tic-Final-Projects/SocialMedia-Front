import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, throwError } from 'rxjs';
import { API_BASE_URL } from '../../config/api.config';
import { LoggingService } from '../../core/services/logging.service';

// Request interfaces
export interface GenerateCaptionRequest {
  tenantId: string;
  topic: string;
  context?: string;
  platform?: string;
  captionCount?: number;
  includeHashtags?: boolean;
  hashtagCount?: number;
  model?: string;
}

export interface GenerateContentPlanRequest {
  tenantId: string;
  topic: string;
  businessContext?: string;
  platform?: string;
  postsPerWeek?: number;
  weeks?: number;
  model?: string;
}

// Response interfaces
export interface CaptionWithHashtags {
  caption: string;
  hashtags: string[];
  tone?: string;
}

export interface GenerateCaptionResponse {
  id: string;
  topic: string;
  captions: CaptionWithHashtags[];
  model?: string;
  generatedAt: string;
}

export interface ContentPlanItem {
  title: string;
  description: string;
  suggestedCaption?: string;
  suggestedHashtags: string[];
  contentType?: string;
  suggestedDay?: string;
  suggestedTime?: string;
}

export interface WeeklyContentPlan {
  weekNumber: number;
  weekStartDate: string;
  posts: ContentPlanItem[];
  theme?: string;
}

export interface GenerateContentPlanResponse {
  id: string;
  topic: string;
  weeklyPlans: WeeklyContentPlan[];
  model?: string;
  generatedAt: string;
}

/**
 * Service for AI-powered content generation
 * Handles generation of new content: captions and content plans
 */
@Injectable({
  providedIn: 'root',
})
export class AIContentGenerationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly loggingService = inject(LoggingService);

  /**
   * Generate multiple captions with hashtags for a topic
   */
  generateCaptions(request: GenerateCaptionRequest): Observable<GenerateCaptionResponse> {
    this.loggingService.debug('Calling generate-captions endpoint', { url: `${this.baseUrl}/api/ai/generate-captions`, request }, 'AIContentGenerationService');

    return this.http
      .post<GenerateCaptionResponse>(`${this.baseUrl}/api/ai/generate-captions`, request)
      .pipe(
        map((response) => {
          this.loggingService.debug('Response received', response, 'AIContentGenerationService');
          if (response) {
            return response;
          }
          throw new Error('Invalid response from server');
        }),
        catchError((error) => {
          this.loggingService.error('HTTP error', error, 'AIContentGenerationService');
          this.loggingService.error('Error details', {
            status: error?.status,
            statusText: error?.statusText,
            error: error?.error,
            message: error?.message,
            url: error?.url,
            body: error?.error,
          }, 'AIContentGenerationService');

          // Extract error message from various possible locations
          let errorMsg = 'Failed to generate captions';
          if (error?.error) {
            if (typeof error.error === 'string') {
              errorMsg = error.error;
            } else if (error.error?.message) {
              errorMsg = error.error.message;
            } else if (error.error?.Message) {
              errorMsg = error.error.Message;
            } else if (Array.isArray(error.error?.errors) && error.error.errors.length > 0) {
              errorMsg = error.error.errors[0];
            }
          } else if (error?.message) {
            errorMsg = error.message;
          }

          return throwError(() => new Error(errorMsg));
        }),
      );
  }

  /**
   * Generate monthly content plan
   */
  generateContentPlan(
    request: GenerateContentPlanRequest,
  ): Observable<GenerateContentPlanResponse> {
    return this.http
      .post<GenerateContentPlanResponse>(`${this.baseUrl}/api/ai/generate-content-plan`, request)
      .pipe(
        map((response) => {
          if (response) {
            return response;
          }
          throw new Error('Invalid response from server');
        }),
        catchError((error) => {
          const errorMsg =
            error?.error?.message ||
            error?.error?.Message ||
            error?.message ||
            'Failed to generate content plan';
          return throwError(() => new Error(errorMsg));
        }),
      );
  }
}

