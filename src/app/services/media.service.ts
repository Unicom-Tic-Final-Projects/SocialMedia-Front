import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError, tap } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { AuthService } from '../core/services/auth.service';
import { MediaAssetResponse } from '../models/post.models';

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
   * Upload media file
   * Note: Backend currently expects metadata, not actual file
   * In production, this would upload the actual file to cloud storage
   */
  uploadMedia(file: File): Observable<MediaAssetResponse> {
    const user = this.authService.user();
    if (!user || !user.tenantId) {
      return throwError(() => new Error('User not authenticated or tenant ID missing'));
    }

    this.uploadingSignal.set(true);

    const request: UploadMediaRequest = {
      tenantId: user.tenantId,
      uploadedByUserId: user.userId,
      fileType: file.type,
      fileSize: file.size,
      fileName: file.name,
    };

    return this.http.post<MediaAssetResponse>(`${this.baseUrl}/api/content/media/upload`, request).pipe(
      tap(() => this.uploadingSignal.set(false)),
      catchError((error) => {
        this.uploadingSignal.set(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get media by ID
   */
  getMedia(mediaId: string): Observable<MediaAssetResponse> {
    return this.http.get<MediaAssetResponse>(`${this.baseUrl}/api/content/media/${mediaId}`);
  }

  /**
   * Get all media for current tenant
   */
  getMediaByTenant(): Observable<MediaAssetResponse[]> {
    const user = this.authService.user();
    if (!user || !user.tenantId) {
      return throwError(() => new Error('User not authenticated or tenant ID missing'));
    }

    return this.http.get<MediaAssetResponse[]>(`${this.baseUrl}/api/content/media/tenant/${user.tenantId}`);
  }
}

