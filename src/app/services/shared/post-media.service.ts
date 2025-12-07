import { Injectable, inject, signal } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { MediaUploadService } from './media-upload.service';
import { MediaService } from '../client/media.service';
import { PostDraftService } from '../client/post-draft.service';
import { Platform } from '../../models/social.models';
import { UploadedFile } from '../../shared/file-upload/file-upload.component';

export interface PlatformCropConfig {
  crop: { zoom: number; offsetX: number; offsetY: number };
  cropBox: { width: number; height: number; left: number; top: number };
}

/**
 * Service for managing post media: upload, preview, crop configurations, and cropped images
 */
@Injectable({
  providedIn: 'root',
})
export class PostMediaService {
  private readonly mediaUploadService = inject(MediaUploadService);
  private readonly mediaService = inject(MediaService);
  private readonly draftService = inject(PostDraftService);

  // Media state
  private readonly selectedFileSignal = signal<File | null>(null);
  readonly selectedFile = this.selectedFileSignal.asReadonly();

  private readonly mediaPreviewSignal = signal<string | null>(null);
  readonly mediaPreview = this.mediaPreviewSignal.asReadonly();

  private readonly uploadedMediaIdSignal = signal<string | null>(null);
  readonly uploadedMediaId = this.uploadedMediaIdSignal.asReadonly();

  private readonly isVideoSignal = signal<boolean>(false);
  readonly isVideo = this.isVideoSignal.asReadonly();

  private readonly uploadedFilesSignal = signal<UploadedFile[]>([]);
  readonly uploadedFiles = this.uploadedFilesSignal.asReadonly();

  /**
   * Update uploaded files list
   */
  setUploadedFiles(files: UploadedFile[]): void {
    this.uploadedFilesSignal.set(files);
  }

  /**
   * Update a specific uploaded file
   */
  updateUploadedFile(fileId: string, updates: Partial<UploadedFile>): void {
    this.uploadedFilesSignal.update((files) =>
      files.map((f) => (f.id === fileId ? { ...f, ...updates } : f)),
    );
  }

  /**
   * Remove an uploaded file
   */
  removeUploadedFile(fileId: string): void {
    this.uploadedFilesSignal.update((files) => files.filter((f) => f.id !== fileId));
  }

  // Platform-specific crop configurations
  private readonly platformCropConfigsSignal = signal<Record<Platform, PlatformCropConfig>>(
    {} as Record<Platform, PlatformCropConfig>,
  );
  readonly platformCropConfigs = this.platformCropConfigsSignal.asReadonly();

  // Platform cropped images (base64 strings per platform)
  private readonly platformCroppedImagesSignal = signal<Record<Platform, string>>(
    {} as Record<Platform, string>,
  );
  readonly platformCroppedImages = this.platformCroppedImagesSignal.asReadonly();

  /**
   * Handle file selection and validation
   */
  async handleFile(file: File): Promise<void> {
    // Validate file using shared service
    const validation = this.mediaUploadService.validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid file');
    }

    this.selectedFileSignal.set(file);
    this.isVideoSignal.set(validation.isVideo || false);

    // Generate preview using shared service
    const preview = await this.mediaUploadService.generatePreview(file);
    this.mediaPreviewSignal.set(preview);

    // Create uploaded file info using shared service
    const fileInfo = this.mediaUploadService.createUploadedFileInfo(file, preview);
    this.uploadedFilesSignal.set([fileInfo]);
  }

  /**
   * Upload media file
   */
  uploadMedia(): Observable<string> {
    const file = this.selectedFileSignal();
    if (!file) {
      return throwError(() => new Error('No file selected'));
    }

    return this.mediaUploadService.uploadFile(file).pipe(
      tap((response) => {
        this.uploadedMediaIdSignal.set(response.mediaId);
        // Also update preview URL to the Cloudinary URL returned from backend
        if (response.mediaUrl) {
          this.mediaPreviewSignal.set(response.mediaUrl);
        }
      }),
      map((response) => response.mediaId),
      catchError((error) => {
        console.error('Error uploading media:', error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Remove selected media
   */
  removeMedia(): void {
    this.selectedFileSignal.set(null);
    this.mediaPreviewSignal.set(null);
    this.uploadedMediaIdSignal.set(null);
    this.isVideoSignal.set(false);
    this.uploadedFilesSignal.set([]);
  }

  /**
   * Set media preview (for loading existing media)
   */
  setMediaPreview(url: string, isVideo: boolean = false): void {
    this.mediaPreviewSignal.set(url);
    this.isVideoSignal.set(isVideo);
  }

  /**
   * Set uploaded media ID
   */
  setUploadedMediaId(mediaId: string): void {
    this.uploadedMediaIdSignal.set(mediaId);
  }

  /**
   * Update platform crop configurations
   */
  updatePlatformCropConfigs(configs: Record<Platform, PlatformCropConfig>): void {
    this.platformCropConfigsSignal.set(configs);
  }

  /**
   * Update platform cropped images
   */
  updatePlatformCroppedImages(images: Record<Platform, string>): void {
    this.platformCroppedImagesSignal.set(images);
  }

  /**
   * Get crop config for a platform
   */
  getCropConfig(platform: Platform): PlatformCropConfig | undefined {
    return this.platformCropConfigsSignal()[platform];
  }

  /**
   * Get cropped image for a platform
   */
  getCroppedImage(platform: Platform): string | undefined {
    return this.platformCroppedImagesSignal()[platform];
  }

  /**
   * Detect media type from URL
   */
  detectMediaType(): 'image' | 'video' | null {
    const url = this.mediaPreviewSignal();
    if (!url) return null;
    const isVideo = this.mediaUploadService.isVideoFile(url);
    return isVideo ? 'video' : 'image';
  }

  /**
   * Save media state to draft
   */
  saveToDraft(): void {
    const draft = this.draftService.getActiveDraft();
    if (!draft) return;

    this.draftService.updateDraft({
      mediaUrl: this.mediaPreviewSignal() || undefined,
      mediaType: this.mediaPreviewSignal()
        ? this.isVideoSignal()
          ? 'video'
          : 'image'
        : undefined,
      platformCropConfigs: this.platformCropConfigsSignal(),
      platformCroppedImages:
        Object.keys(this.platformCroppedImagesSignal()).length > 0
          ? this.platformCroppedImagesSignal()
          : undefined,
    });
  }

  /**
   * Load media state from draft
   */
  loadFromDraft(draft: any): void {
    if (draft.mediaUrl) {
      this.mediaPreviewSignal.set(draft.mediaUrl);
    }
    if (draft.mediaType) {
      this.isVideoSignal.set(draft.mediaType === 'video');
    }
    if (draft.platformCropConfigs) {
      this.platformCropConfigsSignal.set(draft.platformCropConfigs);
    }
    if (draft.platformCroppedImages) {
      this.platformCroppedImagesSignal.set(draft.platformCroppedImages);
    }
  }

  /**
   * Clear all media state
   */
  clear(): void {
    this.removeMedia();
    this.platformCropConfigsSignal.set({} as Record<Platform, PlatformCropConfig>);
    this.platformCroppedImagesSignal.set({} as Record<Platform, string>);
  }
}

