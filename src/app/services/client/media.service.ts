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

    // Backend wraps response in ApiResponse<MediaAssetResponse>
    return this.http.post<any>(`${this.baseUrl}/api/media/upload`, formData).pipe(
      map(response => {
        if (!response) {
          throw new Error('Media upload returned undefined response');
        }
        if (!response.data) {
          throw new Error('Media upload response missing data field');
        }
        return response.data as MediaAssetResponse;
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

