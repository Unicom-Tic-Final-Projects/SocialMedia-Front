import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { MediaService } from '../../../services/client/media.service';
import { PostsService } from '../../../services/client/posts.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmationService } from '../../../core/services/confirmation.service';

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
  private readonly toastService = inject(ToastService);
  private readonly confirmationService = inject(ConfirmationService);

  mediaItems = signal<MediaItem[]>([]);
  loading = signal(false);
  
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
  uploadProgress = signal(0);
  showUploadModal = signal(false);
  isDragging = signal(false);

  ngOnInit(): void {
    this.loadMediaLibrary();
  }

  loadMediaLibrary(): void {
    this.loading.set(true);
    
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
        this.toastService.error('Failed to load media library');
        this.loading.set(false);
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.handleFile(input.files[0]);
    }
  }

  handleFile(file: File): void {
    this.uploadMedia(file);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const target = event.target as HTMLElement;
    if (!target.closest('.drop-zone')) {
      this.isDragging.set(false);
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  uploadMedia(file: File): void {
    this.uploading.set(true);
    this.uploadProgress.set(0);
    this.mediaService.uploadMedia(file, (progress) => {
      this.uploadProgress.set(progress);
    }).subscribe({
      next: (response) => {
        this.uploading.set(false);
        this.uploadProgress.set(100);
        this.showUploadModal.set(false);
        this.toastService.success('Media uploaded successfully!');
        this.loadMediaLibrary();
        // Reset progress after a short delay
        setTimeout(() => {
          this.uploadProgress.set(0);
        }, 1000);
      },
      error: (error) => {
        this.toastService.error('Failed to upload media. Please try again.');
        this.uploading.set(false);
        this.uploadProgress.set(0);
      }
    });
  }

  deleteMedia(mediaId: string): void {
    this.confirmationService.confirm({
      title: 'Delete Media',
      message: 'Are you sure you want to delete this media? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmButtonClass: 'bg-red-500 hover:bg-red-600'
    }).then((confirmed) => {
      if (confirmed) {
        this.mediaService.deleteMedia(mediaId).subscribe({
          next: () => {
            this.toastService.success('Media deleted successfully');
            this.loadMediaLibrary();
          },
          error: (error: HttpErrorResponse) => {
            this.toastService.error('Failed to delete media. Please try again.');
          }
        });
      }
    });
  }

  useInPost(mediaId: string): void {
    // Navigate to post editor with this media pre-selected
    this.router.navigate(['/dashboard/post-editor'], {
      queryParams: { 
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

