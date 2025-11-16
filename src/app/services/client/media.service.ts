import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError, tap, map } from 'rxjs';
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
   * Upload media file.
   * Sends the actual file as multipart/form-data to backend, which uploads to Cloudinary.
   */
  uploadMedia(file: File): Observable<MediaAssetResponse> {
    this.uploadingSignal.set(true);

    const formData = new FormData();
    formData.append('file', file);

    // Response interceptor unwraps ApiResponse<T>, so response is already MediaAssetResponse
    // But we need to handle both cases: unwrapped (from interceptor) and wrapped (if interceptor fails)
    return this.http.post<any>(`${this.baseUrl}/api/media/upload`, formData).pipe(
      map(response => {
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
      tap(() => this.uploadingSignal.set(false)),
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
}

