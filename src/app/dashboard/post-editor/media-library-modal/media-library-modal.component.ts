import { Component, OnInit, OnDestroy, inject, signal, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LoggingService } from '../../../core/services/logging.service';
import { MediaService } from '../../../services/client/media.service';
import { ToastService } from '../../../core/services/toast.service';
import { MediaUploadService } from '../../../services/shared/media-upload.service';
import { BaseComponent } from '../../../core/base/base.component';

interface MediaItem {
  id: string;
  url: string;
  thumbnailUrl?: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: Date;
}

@Component({
  selector: 'app-media-library-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './media-library-modal.component.html',
  styleUrl: './media-library-modal.component.css',
})
export class MediaLibraryModalComponent extends BaseComponent implements OnInit {
  private readonly mediaService = inject(MediaService);
  private readonly toastService = inject(ToastService);
  private readonly mediaUploadService = inject(MediaUploadService);
  private readonly loggingService = inject(LoggingService);

  @Output() mediaSelected = new EventEmitter<MediaItem>();
  @Output() close = new EventEmitter<void>();

  mediaItems = signal<MediaItem[]>([]);
  loading = signal(false);
  selectedFilter = signal<'all' | 'images' | 'videos'>('all');
  searchQuery = signal('');

  ngOnInit(): void {
    this.loadMedia();
  }

  loadMedia(): void {
    this.loading.set(true);
    this.mediaService
      .getMediaByTenant()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Handle both direct array and wrapped response
          const mediaArray = Array.isArray(response) ? response : (response as any).data || [];
          
          const items: MediaItem[] = mediaArray.map((media: any) => ({
            id: media.mediaId || media.id,
            url: media.url,
            thumbnailUrl: media.thumbnailUrl,
            fileName: media.fileName || media.url.split('/').pop(),
            fileType: media.fileType || '',
            fileSize: media.fileSize || 0,
            uploadedAt: new Date(media.uploadedAt),
          }));
          this.mediaItems.set(items);
          this.loading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.loggingService.error('Error loading media', error, 'MediaLibraryModal');
          this.toastService.error('Failed to load media library');
          this.loading.set(false);
        },
      });
  }

  get filteredMedia(): MediaItem[] {
    let items = this.mediaItems();

    // Apply filter
    if (this.selectedFilter() === 'images') {
      items = items.filter((item) => item.fileType.startsWith('image/'));
    } else if (this.selectedFilter() === 'videos') {
      items = items.filter((item) => item.fileType.startsWith('video/'));
    }

    // Apply search
    const query = this.searchQuery().toLowerCase();
    if (query) {
      items = items.filter((item) => item.fileName.toLowerCase().includes(query));
    }

    return items;
  }

  selectMedia(media: MediaItem): void {
    this.mediaSelected.emit(media);
  }

  onClose(): void {
    this.close.emit();
  }

  formatFileSize(bytes: number): string {
    return this.mediaUploadService.formatFileSize(bytes);
  }
}

