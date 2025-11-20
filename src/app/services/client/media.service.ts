import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpEventType, HttpEvent } from '@angular/common/http';
import { Observable, catchError, throwError, tap, map, filter } from 'rxjs';
import { API_BASE_URL } from '../../config/api.config';
import { AuthService } from '../../core/services/auth.service';
import { MediaAssetResponse } from '../../models/post.models';

export interface UploadMediaRequest {
  tenantId: string; // GUID as string
  uploadedByUserId: string; // GUID as string
  fileType: string;
  fileSize: number;
  fileName: string;
}

@Injectable({
  providedIn: 'root'
})
export class MediaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly authService = inject(AuthService);

  private readonly uploadingSignal = signal(false);
  readonly uploading = this.uploadingSignal.asReadonly();

  /**
   * Upload media file with progress tracking.
   * Sends the actual file as multipart/form-data to backend, which uploads to Cloudinary.
   */
  uploadMedia(file: File, onProgress?: (progress: number) => void): Observable<MediaAssetResponse> {
    this.uploadingSignal.set(true);

    const formData = new FormData();
    formData.append('file', file);

    // Use reportProgress to track upload progress
    return this.http.post<any>(`${this.baseUrl}/api/media/upload`, formData, {
      reportProgress: true,
      observe: 'events'
    }).pipe(
      // Handle progress events in tap (side effect)
      tap((event: HttpEvent<any>) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          const progress = Math.round((100 * event.loaded) / event.total);
          if (onProgress) {
            onProgress(progress);
          }
        }
      }),
      // Filter to only emit the final response event
      filter((event: HttpEvent<any>) => event.type === HttpEventType.Response),
      // Map the response event to the actual response data
      map((event: HttpEvent<any>) => {
        this.uploadingSignal.set(false);
        
        // Type guard to ensure we have a response event
        if (event.type !== HttpEventType.Response) {
          throw new Error('Expected response event');
        }
        
        const response = (event as any).body;
        
        if (!response) {
          throw new Error('Media upload returned undefined response');
        }
        
        // Check if response is already unwrapped (has MediaAssetResponse properties)
        if (response.mediaId || response.url) {
          return response as MediaAssetResponse;
        }
        
        // Check if response is wrapped in ApiResponse structure
        if (response.data) {
          return response.data as MediaAssetResponse;
        }
        
        throw new Error('Media upload response missing data field');
      }),
      catchError((error) => {
        this.uploadingSignal.set(false);
        console.error('Media upload error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get media by ID
   */
  getMedia(mediaId: string): Observable<MediaAssetResponse> {
    return this.http.get<MediaAssetResponse>(`${this.baseUrl}/api/media/${mediaId}`);
  }

  /**
   * Get all media for current tenant
   */
  getMediaByTenant(): Observable<MediaAssetResponse[]> {
    const user = this.authService.user();
    if (!user || !user.tenantId) {
      return throwError(() => new Error('User not authenticated or tenant ID missing'));
    }

    return this.http.get<MediaAssetResponse[]>(`${this.baseUrl}/api/media/tenant/${user.tenantId}`);
  }

  /**
   * Delete media by ID
   */
  deleteMedia(mediaId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/api/media/${mediaId}`).pipe(
      catchError((error) => {
        console.error('Media delete error:', error);
        return throwError(() => error);
      })
    );
  }
}

