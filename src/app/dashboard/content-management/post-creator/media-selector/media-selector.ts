import { Component, OnInit, inject, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { MediaService } from '../../../../services/client/media.service';

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
  styleUrl: './media-selector.css'
})
export class MediaSelectorComponent implements OnInit {
  private readonly mediaService = inject(MediaService);

  mediaSelected = output<{ id: string; url: string }>();
  close = output<void>();
  
  mediaItems = signal<MediaItem[]>([]);
  loading = signal(false);
  errorMessage = signal<string | null>(null);
  searchQuery = signal('');
  selectedFilter = signal<'all' | 'images' | 'videos'>('all');

  ngOnInit(): void {
    this.loadMedia();
  }

  loadMedia(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    
    this.mediaService.getMediaByTenant().subscribe({
      next: (mediaAssets) => {
        const items: MediaItem[] = mediaAssets.map(asset => ({
          id: asset.id,
          url: asset.url,
          thumbnailUrl: asset.url,
          fileName: asset.fileName,
          fileType: asset.fileType,
          fileSize: asset.fileSize,
          uploadedAt: new Date(asset.uploadedAt)
        }));
        
        // Apply filters
        let filtered = items;
        
        if (this.selectedFilter() === 'images') {
          filtered = filtered.filter(item => item.fileType.startsWith('image/'));
        } else if (this.selectedFilter() === 'videos') {
          filtered = filtered.filter(item => item.fileType.startsWith('video/'));
        }
        
        if (this.searchQuery()) {
          const query = this.searchQuery().toLowerCase();
          filtered = filtered.filter(item => 
            item.fileName.toLowerCase().includes(query)
          );
        }
        
        this.mediaItems.set(filtered);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set('Failed to load media library');
        this.loading.set(false);
      }
    });
  }

  selectMedia(media: MediaItem): void {
    this.mediaSelected.emit({ id: media.id, url: media.url });
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

