import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, throwError } from 'rxjs';
import { API_BASE_URL } from '../../config/api.config';
import { ApiResponse } from '../../models/auth.models';

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

export interface BestTimeToPostRequest {
  tenantId: string;
  userId?: string;
  platform?: string;
  lookbackDays?: number;
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

export interface GenerateImageRequest {
  tenantId: string;
  prompt: string;
  style?: string;
  aspectRatio?: string;
  width?: number;
  height?: number;
  model?: string;
}

export interface EditImageRequest {
  tenantId: string;
  prompt: string;
  imageUrl: string; // URL or base64 of the image to edit
  preset?: string; // "instagram-post", "story", "twitter-header", "facebook-post", "desktop-wallpaper", "magic-expand"
  aspectRatio?: string;
  width?: number;
  height?: number;
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

export interface GenerateImageResponse {
  id: string;
  prompt: string;
  imageUrl?: string;
  imageBase64?: string;
  width?: number;
  height?: number;
  model?: string;
  generatedAt: string;
}

export interface EditImageResponse {
  id: string;
  prompt: string;
  originalImageUrl?: string;
  editedImageUrl?: string;
  editedImageBase64?: string;
  preset?: string;
  width?: number;
  height?: number;
  model?: string;
  editedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class AIService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  private readonly loadingSignal = signal(false);
  readonly loading = this.loadingSignal.asReadonly();

  private readonly errorSignal = signal<string | null>(null);
  readonly error = this.errorSignal.asReadonly();

  /**
   * Generate multiple captions with hashtags for a topic
   */
  generateCaptions(request: GenerateCaptionRequest): Observable<GenerateCaptionResponse> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    console.log('[AIService] Calling generate-captions endpoint:', `${this.baseUrl}/api/ai/generate-captions`);
    console.log('[AIService] Request payload:', request);

    // Response interceptor unwraps ApiResponse, so we get the data directly
    return this.http.post<GenerateCaptionResponse>(
      `${this.baseUrl}/api/ai/generate-captions`,
      request
    ).pipe(
      map((response) => {
        console.log('[AIService] Response received:', response);
        if (response) {
          this.loadingSignal.set(false);
          return response;
        }
        throw new Error('Invalid response from server');
      }),
      catchError((error) => {
        console.error('[AIService] HTTP error:', error);
        console.error('[AIService] Error details:', {
          status: error?.status,
          statusText: error?.statusText,
          error: error?.error,
          message: error?.message,
          url: error?.url,
          body: error?.error
        });
        
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
        
        this.errorSignal.set(errorMsg);
        this.loadingSignal.set(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get best time to post based on engagement patterns
   */
  getBestTimeToPost(request: BestTimeToPostRequest): Observable<BestTimeToPostResponse> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    // Response interceptor unwraps ApiResponse, so we get the data directly
    return this.http.post<BestTimeToPostResponse>(
      `${this.baseUrl}/api/ai/best-time-to-post`,
      request
    ).pipe(
      map((response) => {
        if (response) {
          this.loadingSignal.set(false);
          return response;
        }
        throw new Error('Invalid response from server');
      }),
      catchError((error) => {
        const errorMsg = error?.error?.message || error?.error?.Message || error?.message || 'Failed to get best time to post';
        this.errorSignal.set(errorMsg);
        this.loadingSignal.set(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Generate monthly content plan
   */
  generateContentPlan(request: GenerateContentPlanRequest): Observable<GenerateContentPlanResponse> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    // Response interceptor unwraps ApiResponse, so we get the data directly
    return this.http.post<GenerateContentPlanResponse>(
      `${this.baseUrl}/api/ai/generate-content-plan`,
      request
    ).pipe(
      map((response) => {
        if (response) {
          this.loadingSignal.set(false);
          return response;
        }
        throw new Error('Invalid response from server');
      }),
      catchError((error) => {
        const errorMsg = error?.error?.message || error?.error?.Message || error?.message || 'Failed to generate content plan';
        this.errorSignal.set(errorMsg);
        this.loadingSignal.set(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Generate image using AI (Gemini)
   */
  generateImage(request: GenerateImageRequest): Observable<GenerateImageResponse> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    // Response interceptor unwraps ApiResponse, so we get the data directly
    return this.http.post<GenerateImageResponse>(
      `${this.baseUrl}/api/ai/generate-image`,
      request
    ).pipe(
      map((response) => {
        if (response) {
          this.loadingSignal.set(false);
          return response;
        }
        throw new Error('Invalid response from server');
      }),
      catchError((error) => {
        const errorMsg = error?.error?.message || error?.error?.Message || error?.message || 'Failed to generate image';
        this.errorSignal.set(errorMsg);
        this.loadingSignal.set(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Edit image using AI (Gemini)
   */
  editImage(request: EditImageRequest): Observable<EditImageResponse> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    // Response interceptor unwraps ApiResponse, so we get the data directly
    return this.http.post<EditImageResponse>(
      `${this.baseUrl}/api/ai/edit-image`,
      request
    ).pipe(
      map((response) => {
        if (response) {
          this.loadingSignal.set(false);
          return response;
        }
        throw new Error('Invalid response from server');
      }),
      catchError((error) => {
        const errorMsg = error?.error?.message || error?.error?.Message || error?.message || 'Failed to edit image';
        this.errorSignal.set(errorMsg);
        this.loadingSignal.set(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Improve existing content using AI
   */
  improveContent(request: { tenantId: string; content: string; platform?: string }): Observable<string> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    const generateRequest = {
      tenantId: request.tenantId,
      generationType: 'ContentImprovement',
      prompt: request.content // The content to improve - backend will handle the improvement prompt
    };

    console.log('[AIService] Calling improveContent endpoint:', `${this.baseUrl}/api/ai/generate`);
    console.log('[AIService] Request payload:', generateRequest);

    // Response interceptor unwraps ApiResponse, so we get the AIGenerationResponse directly
    return this.http.post<any>(
      `${this.baseUrl}/api/ai/generate`,
      generateRequest
    ).pipe(
      map((response) => {
        console.log('[AIService] Response received:', response);
        // Response interceptor unwraps ApiResponse, so response is the AIGenerationResponse object
        // Check for generatedContent directly (not response.data.generatedContent)
        if (response?.generatedContent) {
          this.loadingSignal.set(false);
          return response.generatedContent || '';
        }
        // If response structure is different, log it for debugging
        console.error('[AIService] Invalid response structure:', response);
        throw new Error('Invalid response from server: missing generatedContent');
      }),
      catchError((error) => {
        console.error('[AIService] Error improving content:', error);
        console.error('[AIService] Error details:', {
          status: error?.status,
          statusText: error?.statusText,
          error: error?.error,
          message: error?.message
        });
        const errorMsg = error?.error?.message || error?.message || 'Failed to improve content';
        this.errorSignal.set(errorMsg);
        this.loadingSignal.set(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Suggest hashtags (existing method - keeping for compatibility)
   */
  suggestHashtags(tenantId: string, postId: string, content: string, maxCount: number = 10): Observable<any> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.post<ApiResponse<any>>(
      `${this.baseUrl}/api/ai/suggest-hashtags`,
      {
        tenantId,
        relatedEntityId: postId,
        content,
        maxCount
      }
    ).pipe(
      map((response) => {
        if (response?.success && response.data) {
          return response.data;
        }
        throw new Error(response?.message || 'Failed to suggest hashtags');
      }),
      catchError((error) => {
        this.errorSignal.set(error.message || 'Failed to suggest hashtags');
        return throwError(() => error);
      }),
      map((data) => {
        this.loadingSignal.set(false);
        return data;
      })
    );
  }
}

