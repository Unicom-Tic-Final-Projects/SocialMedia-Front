import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, throwError } from 'rxjs';
import { API_BASE_URL } from '../../config/api.config';

// Request interfaces
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

/**
 * Service for AI-powered image generation and editing
 * Handles image generation and image editing using AI models
 */
@Injectable({
  providedIn: 'root',
})
export class AIImageService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  /**
   * Generate image using AI (Gemini)
   */
  generateImage(request: GenerateImageRequest): Observable<GenerateImageResponse> {
    return this.http
      .post<GenerateImageResponse>(`${this.baseUrl}/api/ai/generate-image`, request)
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
            'Failed to generate image';
          return throwError(() => new Error(errorMsg));
        }),
      );
  }

  /**
   * Edit image using AI (Gemini)
   */
  editImage(request: EditImageRequest): Observable<EditImageResponse> {
    return this.http.post<EditImageResponse>(`${this.baseUrl}/api/ai/edit-image`, request).pipe(
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
          'Failed to edit image';
        return throwError(() => new Error(errorMsg));
      }),
    );
  }
}

