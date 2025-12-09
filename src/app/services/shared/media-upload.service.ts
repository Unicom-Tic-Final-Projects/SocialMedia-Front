import { Injectable, inject, signal } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { tap, map, catchError } from 'rxjs/operators';
import { MediaService } from '../client/media.service';
import { ToastService } from '../../core/services/toast.service';
import { MediaAssetResponse } from '../../models/post.models';

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  isImage?: boolean;
  isVideo?: boolean;
}

export interface UploadedFileInfo {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  preview: string;
  progress: number;
  failed: boolean;
  mediaId?: string;
  mediaUrl?: string;
}

/**
 * Service for handling media file uploads with validation, preview, and progress tracking
 * Shared across post-editor, post-creator, and content-library components
 */
@Injectable({
  providedIn: 'root',
})
export class MediaUploadService {
  private readonly mediaService = inject(MediaService);
  private readonly toastService = inject(ToastService);

  private readonly uploadingSignal = signal(false);
  readonly uploading = this.uploadingSignal.asReadonly();

  /**
   * Validate file type and size
   */
  validateFile(file: File, options?: { maxImageSize?: number; maxVideoSize?: number }): FileValidationResult {
    const maxImageSize = options?.maxImageSize ?? 10 * 1024 * 1024; // 10MB default for images
    const maxVideoSize = options?.maxVideoSize ?? 100 * 1024 * 1024; // 100MB default for videos

    // Check file type
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    // If MIME type is missing, check file extension
    if (!isImage && !isVideo) {
      const fileName = file.name.toLowerCase();
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.flv', '.wmv'];

      const hasImageExt = imageExtensions.some((ext) => fileName.endsWith(ext));
      const hasVideoExt = videoExtensions.some((ext) => fileName.endsWith(ext));

      if (!hasImageExt && !hasVideoExt) {
        return {
          valid: false,
          error: 'Invalid file type. Please upload an image or video file.',
        };
      }

      // If we detected by extension, return with type info
      if (hasImageExt) {
        const maxSize = maxImageSize;
        if (file.size > maxSize) {
          return {
            valid: false,
            error: `File size exceeds ${maxSize / (1024 * 1024)}MB limit. Please choose a smaller file.`,
            isImage: true,
          };
        }
        return { valid: true, isImage: true };
      }

      if (hasVideoExt) {
        const maxSize = maxVideoSize;
        if (file.size > maxSize) {
          return {
            valid: false,
            error: `File size exceeds ${maxSize / (1024 * 1024)}MB limit. Please choose a smaller file.`,
            isVideo: true,
          };
        }
        return { valid: true, isVideo: true };
      }
    }

    // Validate size based on type
    const maxSize = isVideo ? maxVideoSize : maxImageSize;
    if (file.size > maxSize) {
      const sizeLimitMB = isVideo ? maxVideoSize / (1024 * 1024) : maxImageSize / (1024 * 1024);
      return {
        valid: false,
        error: `File size exceeds ${sizeLimitMB}MB limit. Please choose a smaller file.`,
        isImage,
        isVideo,
      };
    }

    return { valid: true, isImage, isVideo };
  }

  /**
   * Generate preview URL from file
   */
  generatePreview(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = e.target?.result as string;
        if (preview) {
          resolve(preview);
        } else {
          reject(new Error('Failed to generate preview'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Detect if file is video from URL or type
   */
  isVideoFile(fileOrUrl: File | string, fileType?: string): boolean {
    if (fileOrUrl instanceof File) {
      return fileOrUrl.type.startsWith('video/') || /\.(mp4|mov|avi|webm|mkv|flv|wmv)$/i.test(fileOrUrl.name);
    }

    // Check from URL extension
    if (typeof fileOrUrl === 'string') {
      const isVideoUrl = /\.(mp4|mov|avi|webm|mkv|flv|wmv)(\?|$)/i.test(fileOrUrl);
      if (isVideoUrl) return true;

      // Check from fileType parameter
      if (fileType) {
        return fileType.startsWith('video/');
      }
    }

    return false;
  }

  /**
   * Upload file with progress tracking
   */
  uploadFile(
    file: File,
    onProgress?: (progress: number) => void,
  ): Observable<{ mediaId: string; mediaUrl?: string }> {
    // Validate first
    const validation = this.validateFile(file);
    if (!validation.valid) {
      this.toastService.error(validation.error || 'Invalid file');
      return throwError(() => new Error(validation.error || 'Invalid file'));
    }

    this.uploadingSignal.set(true);

    return this.mediaService.uploadMedia(file, onProgress).pipe(
      tap((response: MediaAssetResponse) => {
        this.uploadingSignal.set(false);
        if (!response || !response.id) {
          throw new Error('Media upload returned invalid response');
        }
      }),
      map((response: MediaAssetResponse) => ({
        mediaId: response.id,
        mediaUrl: response.url,
      })),
      catchError((error) => {
        this.uploadingSignal.set(false);
        const errorMsg =
          error?.error?.message ||
          error?.error?.Message ||
          error?.message ||
          'Failed to upload media. Please try again.';
        this.toastService.error(errorMsg);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Create UploadedFileInfo from File
   */
  createUploadedFileInfo(file: File, preview: string): UploadedFileInfo {
    return {
      id: `file-${Date.now()}-${Math.random()}`,
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      preview,
      progress: 0,
      failed: false,
    };
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
}

