import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, throwError } from 'rxjs';
import { API_BASE_URL } from '../../config/api.config';
import { ApiResponse } from '../../models/auth.models';
import { LoggingService } from '../../core/services/logging.service';

// Request interfaces
export interface BestTimeToPostRequest {
  tenantId: string;
  userId?: string;
  platform?: string;
  lookbackDays?: number;
  model?: string;
}

export interface ImproveContentRequest {
  tenantId: string;
  content: string;
  platform?: string;
}

// Response interfaces
export interface OptimalPostTime {
  dayOfWeek: string;
  hour: number;
  timeDisplay: string;
  engagementScore: number;
  reason?: string;
}

export interface BestTimeToPostResponse {
  optimalTimes: OptimalPostTime[];
  platform?: string;
  analysisSummary?: string;
  analyzedAt: string;
}

/**
 * Service for AI-powered content optimization
 * Handles optimization of existing content: improvement, hashtag suggestions, and posting time analysis
 */
@Injectable({
  providedIn: 'root',
})
export class AIContentOptimizationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly loggingService = inject(LoggingService);

  /**
   * Get best time to post based on engagement patterns
   */
  getBestTimeToPost(request: BestTimeToPostRequest): Observable<BestTimeToPostResponse> {
    return this.http
      .post<BestTimeToPostResponse>(`${this.baseUrl}/api/ai/best-time-to-post`, request)
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
            'Failed to get best time to post';
          return throwError(() => new Error(errorMsg));
        }),
      );
  }

  /**
   * Improve existing content using AI
   */
  improveContent(request: ImproveContentRequest): Observable<string> {
    const generateRequest = {
      tenantId: request.tenantId,
      generationType: 'ContentImprovement',
      prompt: request.content, // The content to improve - backend will handle the improvement prompt
    };

    this.loggingService.debug('Calling improveContent endpoint', { url: `${this.baseUrl}/api/ai/generate`, request: generateRequest }, 'AIContentOptimizationService');

    return this.http.post<any>(`${this.baseUrl}/api/ai/generate`, generateRequest).pipe(
      map((response) => {
        this.loggingService.debug('Response received', response, 'AIContentOptimizationService');
        if (response?.generatedContent) {
          return response.generatedContent || '';
        }
        this.loggingService.error('Invalid response structure', response, 'AIContentOptimizationService');
        throw new Error('Invalid response from server: missing generatedContent');
      }),
      catchError((error) => {
        this.loggingService.error('Error improving content', error, 'AIContentOptimizationService');
        this.loggingService.error('Error details', {
          status: error?.status,
          statusText: error?.statusText,
          error: error?.error,
          message: error?.message,
        }, 'AIContentOptimizationService');
        const errorMsg = error?.error?.message || error?.message || 'Failed to improve content';
        return throwError(() => new Error(errorMsg));
      }),
    );
  }

  /**
   * Suggest hashtags
   */
  suggestHashtags(
    tenantId: string,
    postId: string,
    content: string,
    maxCount: number = 10,
  ): Observable<any> {
    return this.http
      .post<ApiResponse<any>>(`${this.baseUrl}/api/ai/suggest-hashtags`, {
        tenantId,
        relatedEntityId: postId,
        content,
        maxCount,
      })
      .pipe(
        map((response) => {
          if (response?.success && response.data) {
            return response.data;
          }
          throw new Error(response?.message || 'Failed to suggest hashtags');
        }),
        catchError((error) => {
          return throwError(() => new Error(error.message || 'Failed to suggest hashtags'));
        }),
      );
  }
}

