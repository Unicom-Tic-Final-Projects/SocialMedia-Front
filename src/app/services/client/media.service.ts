import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpEventType, HttpEvent, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError, tap, map, filter } from 'rxjs';
import { API_BASE_URL } from '../../config/api.config';
import { AuthService } from '../../core/services/auth.service';
import { LoggingService } from '../../core/services/logging.service';
import { MediaAssetResponse } from '../../models/post.models';

export interface UploadMediaRequest {
  tenantId: string; // GUID as string
  uploadedByUserId: string; // GUID as string
  fileType: string;
  fileSize: number;
  fileName: string;
}

@Injectable({
  providedIn: 'root',
})
export class MediaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly authService = inject(AuthService);
  private readonly loggingService = inject(LoggingService);

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
    return this.http
      .post<any>(`${this.baseUrl}/api/media/upload`, formData, {
        reportProgress: true,
        observe: 'events',
      })
      .pipe(
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
          this.loggingService.error('Media upload error', error, 'MediaService');
          return throwError(() => error);
        }),
      );
  }

  /**
   * Get media by ID
   */
  getMedia(mediaId: string): Observable<MediaAssetResponse> {
    return this.http.get<any>(`${this.baseUrl}/api/media/${mediaId}`).pipe(
      map((response) => {
        // Handle both direct response and wrapped ApiResponse
        if (response.data) {
          return response.data as MediaAssetResponse;
        }
        return response as MediaAssetResponse;
      }),
      catchError((error) => {
        this.loggingService.error('Media get error', error, 'MediaService');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Get all media for current tenant
   */
  getMediaByTenant(): Observable<MediaAssetResponse[]> {
    const user = this.authService.user();
    if (!user || !user.tenantId) {
      this.loggingService.error('User not authenticated or tenant ID missing', null, 'MediaService');
      return throwError(() => new Error('User not authenticated or tenant ID missing'));
    }

    this.loggingService.debug(`Fetching media for tenant: ${user.tenantId}`, null, 'MediaService');

    return this.http.get<any>(`${this.baseUrl}/api/media/tenant/${user.tenantId}`).pipe(
      tap((response) => {
        this.loggingService.debug(`Media API response received`, { 
          isArray: Array.isArray(response),
          hasData: !!response?.data,
          dataLength: response?.data?.length || response?.length || 0
        }, 'MediaService');
      }),
      map((response) => {
        // Handle both direct array and wrapped ApiResponse
        if (Array.isArray(response)) {
          this.loggingService.debug(`Returning direct array with ${response.length} items`, null, 'MediaService');
          return response as MediaAssetResponse[];
        }
        // Handle camelCase (data) and PascalCase (Data) properties
        const data = response?.data || response?.Data;
        if (data && Array.isArray(data)) {
          this.loggingService.debug(`Returning wrapped array with ${data.length} items`, null, 'MediaService');
          return data as MediaAssetResponse[];
        }
        // Log the full response structure for debugging
        this.loggingService.debug('No valid media data found in response', { 
          response,
          responseKeys: response ? Object.keys(response) : [],
          hasData: !!response?.data,
          hasDataPascal: !!response?.Data,
          dataType: typeof response?.data,
          dataPascalType: typeof response?.Data
        }, 'MediaService');
        return [];
      }),
      catchError((error) => {
        this.loggingService.error('Media get by tenant error', error, 'MediaService');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Delete media by ID
   */
  deleteMedia(mediaId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/api/media/${mediaId}`).pipe(
      catchError((error) => {
        this.loggingService.error('Media delete error', error, 'MediaService');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Bulk delete media
   */
  bulkDeleteMedia(mediaIds: string[]): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/api/media/bulk-delete`, { mediaIds }).pipe(
      catchError((error) => {
        this.loggingService.error('Media bulk delete error', error, 'MediaService');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Search media by query
   */
  searchMedia(query: string): Observable<MediaAssetResponse[]> {
    const params = new HttpParams().set('query', query);
    return this.http.get<any>(`${this.baseUrl}/api/media/search`, { params }).pipe(
      map((response) => {
        if (Array.isArray(response)) return response;
        return response?.data || [];
      }),
      catchError((error) => {
        this.loggingService.error('Media search error', error, 'MediaService');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Get media statistics
   */
  getMediaStatistics(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/api/media/statistics`).pipe(
      catchError((error) => {
        this.loggingService.error('Media statistics error', error, 'MediaService');
        return throwError(() => error);
      }),
    );
  }
}
