import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, throwError } from 'rxjs';
import {
  AIContentGenerationService,
  type GenerateCaptionRequest,
  type GenerateContentPlanRequest,
  type GenerateCaptionResponse,
  type GenerateContentPlanResponse,
  type CaptionWithHashtags,
  type ContentPlanItem,
  type WeeklyContentPlan,
} from './ai-content-generation.service';
import {
  AIContentOptimizationService,
  type BestTimeToPostRequest,
  type ImproveContentRequest,
  type BestTimeToPostResponse,
  type OptimalPostTime,
} from './ai-content-optimization.service';
import {
  AIImageService,
  type GenerateImageRequest,
  type EditImageRequest,
  type GenerateImageResponse,
  type EditImageResponse,
} from './ai-image.service';

// Re-export all interfaces for backward compatibility
export type {
  GenerateCaptionRequest,
  GenerateContentPlanRequest,
  CaptionWithHashtags,
  GenerateCaptionResponse,
  ContentPlanItem,
  WeeklyContentPlan,
  GenerateContentPlanResponse,
} from './ai-content-generation.service';

export type {
  BestTimeToPostRequest,
  ImproveContentRequest,
  OptimalPostTime,
  BestTimeToPostResponse,
} from './ai-content-optimization.service';

export type {
  GenerateImageRequest,
  EditImageRequest,
  GenerateImageResponse,
  EditImageResponse,
} from './ai-image.service';

/**
 * Facade service for AI operations
 * Delegates to specialized services (AIContentGenerationService, AIContentOptimizationService, AIImageService)
 * and manages shared loading/error state
 */
@Injectable({
  providedIn: 'root',
})
export class AIService {
  private readonly contentGenerationService = inject(AIContentGenerationService);
  private readonly contentOptimizationService = inject(AIContentOptimizationService);
  private readonly imageService = inject(AIImageService);

  // Shared state management
  private readonly loadingSignal = signal(false);
  readonly loading = this.loadingSignal.asReadonly();

  private readonly errorSignal = signal<string | null>(null);
  readonly error = this.errorSignal.asReadonly();

  /**
   * Generate multiple captions with hashtags for a topic
   */
  generateCaptions(request: GenerateCaptionRequest): Observable<GenerateCaptionResponse> {
    this.setLoading(true);
    this.clearError();

    return this.contentGenerationService.generateCaptions(request).pipe(
      catchError((error) => {
        const errorMsg = this.extractErrorMessage(error) || 'Failed to generate captions';
        this.setError(errorMsg);
        return throwError(() => error);
      }),
      finalize(() => {
        this.setLoading(false);
      }),
    );
  }

  /**
   * Get best time to post based on engagement patterns
   */
  getBestTimeToPost(request: BestTimeToPostRequest): Observable<BestTimeToPostResponse> {
    this.setLoading(true);
    this.clearError();

    return this.contentOptimizationService.getBestTimeToPost(request).pipe(
      catchError((error) => {
        const errorMsg = this.extractErrorMessage(error) || 'Failed to get best time to post';
        this.setError(errorMsg);
        return throwError(() => error);
      }),
      finalize(() => {
        this.setLoading(false);
      }),
    );
  }

  /**
   * Generate monthly content plan
   */
  generateContentPlan(
    request: GenerateContentPlanRequest,
  ): Observable<GenerateContentPlanResponse> {
    this.setLoading(true);
    this.clearError();

    return this.contentGenerationService.generateContentPlan(request).pipe(
      catchError((error) => {
        const errorMsg = this.extractErrorMessage(error) || 'Failed to generate content plan';
        this.setError(errorMsg);
        return throwError(() => error);
      }),
      finalize(() => {
        this.setLoading(false);
      }),
    );
  }

  /**
   * Improve existing content using AI
   */
  improveContent(request: {
    tenantId: string;
    content: string;
    platform?: string;
  }): Observable<string> {
    this.setLoading(true);
    this.clearError();

    return this.contentOptimizationService.improveContent(request).pipe(
      catchError((error) => {
        const errorMsg = this.extractErrorMessage(error) || 'Failed to improve content';
        this.setError(errorMsg);
        return throwError(() => error);
      }),
      finalize(() => {
        this.setLoading(false);
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
    this.setLoading(true);
    this.clearError();

    return this.contentOptimizationService.suggestHashtags(tenantId, postId, content, maxCount).pipe(
      catchError((error) => {
        const errorMsg = this.extractErrorMessage(error) || 'Failed to suggest hashtags';
        this.setError(errorMsg);
        return throwError(() => error);
      }),
      finalize(() => {
        this.setLoading(false);
      }),
    );
  }

  /**
   * Generate image using AI (Gemini)
   */
  generateImage(request: GenerateImageRequest): Observable<GenerateImageResponse> {
    this.setLoading(true);
    this.clearError();

    return this.imageService.generateImage(request).pipe(
      catchError((error) => {
        const errorMsg = this.extractErrorMessage(error) || 'Failed to generate image';
        this.setError(errorMsg);
        return throwError(() => error);
      }),
      finalize(() => {
        this.setLoading(false);
      }),
    );
  }

  /**
   * Edit image using AI (Gemini)
   */
  editImage(request: EditImageRequest): Observable<EditImageResponse> {
    this.setLoading(true);
    this.clearError();

    return this.imageService.editImage(request).pipe(
      catchError((error) => {
        const errorMsg = this.extractErrorMessage(error) || 'Failed to edit image';
        this.setError(errorMsg);
        return throwError(() => error);
      }),
      finalize(() => {
        this.setLoading(false);
      }),
    );
  }

  /**
   * Set loading state
   */
  private setLoading(loading: boolean): void {
    this.loadingSignal.set(loading);
  }

  /**
   * Set error state
   */
  private setError(error: string): void {
    this.errorSignal.set(error);
  }

  /**
   * Clear error state
   */
  private clearError(): void {
    this.errorSignal.set(null);
  }

  /**
   * Extract error message from various error formats
   */
  private extractErrorMessage(error: any): string | null {
    if (!error) return null;

    // If error is already a string
    if (typeof error === 'string') return error;

    // Check for nested error objects
    if (error?.error) {
      const nestedError = error.error;
      if (typeof nestedError === 'string') return nestedError;
      if (nestedError?.message) return nestedError.message;
      if (nestedError?.Message) return nestedError.Message;
      if (Array.isArray(nestedError?.errors) && nestedError.errors.length > 0) {
        return nestedError.errors[0];
      }
    }

    // Check top-level message properties
    if (error?.message) return error.message;
    if (error?.Message) return error.Message;

    // Check for userMessage (custom API error format)
    if (error?.userMessage) return error.userMessage;

    return null;
  }
}
