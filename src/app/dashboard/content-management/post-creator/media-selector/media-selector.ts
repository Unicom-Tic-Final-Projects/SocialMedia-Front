import { Component, OnInit, OnDestroy, inject, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { MediaService } from '../../../../services/client/media.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LoggingService } from '../../../../core/services/logging.service';
import { BaseComponent } from '../../../../core/base/base.component';

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
  selector: 'app-media-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './media-selector.html',
  styleUrl: './media-selector.css',
})
export class MediaSelectorComponent extends BaseComponent implements OnInit {
  private readonly mediaService = inject(MediaService);
  private readonly toastService = inject(ToastService);
  private readonly loggingService = inject(LoggingService);

  mediaSelected = output<{ id: string; url: string; fileType?: string }>();
  closeModal = output<void>();

  mediaItems = signal<MediaItem[]>([]);
  loading = signal(false);
  searchQuery = signal('');
  selectedFilter = signal<'all' | 'images' | 'videos'>('all');

  ngOnInit(): void {
    this.loadMedia();
  }

  loadMedia(): void {
    this.loading.set(true);

    this.mediaService
      .getMediaByTenant()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
      next: (mediaAssets) => {
        const items: MediaItem[] = mediaAssets.map((asset) => ({
          id: asset.id,
          url: asset.url,
          thumbnailUrl: asset.url,
          fileName: asset.fileName,
          fileType: asset.fileType,
          fileSize: asset.fileSize,
          uploadedAt: new Date(asset.uploadedAt),
        }));

        // Apply filters
        let filtered = items;

        if (this.selectedFilter() === 'images') {
          filtered = filtered.filter((item) => item.fileType.startsWith('image/'));
        } else if (this.selectedFilter() === 'videos') {
          filtered = filtered.filter((item) => item.fileType.startsWith('video/'));
        }

        if (this.searchQuery()) {
          const query = this.searchQuery().toLowerCase();
          filtered = filtered.filter((item) => item.fileName.toLowerCase().includes(query));
        }

        this.mediaItems.set(filtered);
        this.loading.set(false);
      },
      error: (_error: HttpErrorResponse) => {
        this.toastService.error('Failed to load media library');
        this.loading.set(false);
      },
    });
  }

  selectMedia(media: MediaItem): void {
    this.mediaSelected.emit({ id: media.id, url: media.url, fileType: media.fileType });
  }

  onSearchChange(): void {
    this.loadMedia();
  }

  onFilterChange(): void {
    this.loadMedia();
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

}
