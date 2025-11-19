import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { MediaService } from '../../../services/client/media.service';
import { PostsService } from '../../../services/client/posts.service';

interface MediaItem {
  id: string;
  url: string;
  thumbnailUrl?: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: Date;
  usedInPosts?: number;
}

@Component({
  selector: 'app-content-library',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './content-library.html',
  styleUrl: './content-library.css'
})
export class ContentLibraryComponent implements OnInit {
  private readonly mediaService = inject(MediaService);
  private readonly postsService = inject(PostsService);
  private readonly router = inject(Router);

  mediaItems = signal<MediaItem[]>([]);
  loading = signal(false);
  errorMessage = signal<string | null>(null);
  
  // Filters
  selectedFilter = signal<'all' | 'images' | 'videos' | 'used' | 'unused'>('all');
  searchQuery = signal('');
  sortBy = signal<'date' | 'name' | 'size'>('date');
  sortOrder = signal<'asc' | 'desc'>('desc');
  
  // Watch for filter/search changes
  onFilterChange(): void {
    this.loadMediaLibrary();
  }
  
  onSearchChange(): void {
    this.loadMediaLibrary();
  }
  
  onSortChange(): void {
    this.loadMediaLibrary();
  }
  
  toggleSortOrder(): void {
    this.sortOrder.set(this.sortOrder() === 'asc' ? 'desc' : 'asc');
    this.onSortChange();
  }

  // Upload
  uploading = signal(false);
  showUploadModal = signal(false);

  ngOnInit(): void {
    this.loadMediaLibrary();
  }

  loadMediaLibrary(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    
    this.mediaService.getMediaByTenant().subscribe({
      next: (mediaAssets) => {
        // Map MediaAssetResponse to MediaItem
        const items: MediaItem[] = mediaAssets.map(asset => ({
          id: asset.id,
          url: asset.url,
          thumbnailUrl: asset.url, // Use same URL for thumbnail
          fileName: asset.fileName,
          fileType: asset.fileType,
          fileSize: asset.fileSize,
          uploadedAt: new Date(asset.uploadedAt),
          usedInPosts: 0 // TODO: Get actual usage count from posts
        }));
        
        // Apply filters
        let filtered = items;
        
        // Filter by type
        if (this.selectedFilter() === 'images') {
          filtered = filtered.filter(item => item.fileType.startsWith('image/'));
        } else if (this.selectedFilter() === 'videos') {
          filtered = filtered.filter(item => item.fileType.startsWith('video/'));
        }
        
        // Filter by search query
        if (this.searchQuery()) {
          const query = this.searchQuery().toLowerCase();
          filtered = filtered.filter(item => 
            item.fileName.toLowerCase().includes(query)
          );
        }
        
        // Sort items
        filtered.sort((a, b) => {
          let comparison = 0;
          
          switch (this.sortBy()) {
            case 'name':
              comparison = a.fileName.localeCompare(b.fileName);
              break;
            case 'size':
              comparison = a.fileSize - b.fileSize;
              break;
            case 'date':
            default:
              comparison = a.uploadedAt.getTime() - b.uploadedAt.getTime();
              break;
          }
          
          return this.sortOrder() === 'asc' ? comparison : -comparison;
        });
        
        this.mediaItems.set(filtered);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set('Failed to load media library');
        this.loading.set(false);
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.uploadMedia(file);
    }
  }

  uploadMedia(file: File): void {
    this.uploading.set(true);
    this.mediaService.uploadMedia(file).subscribe({
      next: (response) => {
        this.uploading.set(false);
        this.showUploadModal.set(false);
        this.loadMediaLibrary();
      },
      error: (error) => {
        this.errorMessage.set('Failed to upload media');
        this.uploading.set(false);
      }
    });
  }

  deleteMedia(mediaId: string): void {
    if (confirm('Are you sure you want to delete this media?')) {
      this.mediaService.deleteMedia(mediaId).subscribe({
        next: () => {
          this.loadMediaLibrary();
        },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set('Failed to delete media');
      }
      });
    }
  }

  useInPost(mediaId: string): void {
    // Navigate to post creator with this media pre-selected
    this.router.navigate(['/dashboard/content-management'], {
      queryParams: { 
        tab: 'create', 
        mediaId 
      }
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
}

