import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LoggingService } from '../../../core/services/logging.service';
import { MediaService } from '../../../services/client/media.service';
import { PostsService } from '../../../services/client/posts.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { MediaUploadService } from '../../../services/shared/media-upload.service';
import { AuthService } from '../../../core/services/auth.service';
import { ClientContextService } from '../../../services/client/client-context.service';
import { BaseComponent } from '../../../core/base/base.component';

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
  styleUrl: './content-library.css',
})
export class ContentLibraryComponent extends BaseComponent implements OnInit {
  private readonly mediaService = inject(MediaService);
  private readonly postsService = inject(PostsService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly mediaUploadService = inject(MediaUploadService);
  private readonly loggingService = inject(LoggingService);
  private readonly authService = inject(AuthService);
  private readonly clientContextService = inject(ClientContextService);

  mediaItems = signal<MediaItem[]>([]);
  allMediaItems = signal<MediaItem[]>([]); // Store all items for pagination
  loading = signal(false);

  // Filters
  selectedFilter = signal<'all' | 'images' | 'videos' | 'used' | 'unused'>('all');
  searchQuery = signal('');
  sortBy = signal<'date' | 'name' | 'size'>('date');
  sortOrder = signal<'asc' | 'desc'>('desc');

  // Pagination
  currentPage = signal(1);
  pageSize = signal(24); // 24 items per page (4x6 grid)
  totalItems = signal(0);
  totalPages = computed(() => Math.ceil(this.totalItems() / this.pageSize()));
  paginatedItems = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    const end = start + this.pageSize();
    return this.mediaItems().slice(start, end);
  });

  // Watch for filter/search changes
  onFilterChange(): void {
    this.currentPage.set(1); // Reset to first page
    this.applyFiltersAndPagination();
  }

  onSearchChange(): void {
    this.currentPage.set(1); // Reset to first page
    this.applyFiltersAndPagination();
  }

  onSortChange(): void {
    this.applyFiltersAndPagination();
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
        this.loggingService.debug(`Loaded ${mediaAssets?.length || 0} media assets`, { 
          mediaAssets,
          firstAsset: mediaAssets?.[0],
          firstAssetKeys: mediaAssets?.[0] ? Object.keys(mediaAssets[0]) : []
        }, 'ContentLibrary');
        
        if (!mediaAssets || mediaAssets.length === 0) {
          this.loggingService.debug('No media assets returned from API', null, 'ContentLibrary');
          this.allMediaItems.set([]);
          this.mediaItems.set([]);
          this.totalItems.set(0);
          this.loading.set(false);
          return;
        }

        // Map MediaAssetResponse to MediaItem
        // Handle both id and mediaId properties (backend may return either or both)
        const items: MediaItem[] = mediaAssets
          .filter((asset) => asset && (asset.id || asset.mediaId)) // Filter out null/undefined assets - check both id and mediaId
          .map((asset) => {
            // Use mediaId first (more reliable), then fallback to id
            const mediaId = asset.mediaId || asset.id || '';
            const fileName = asset.fileName || asset.url?.split('/').pop() || 'Unknown';
            
            return {
              id: mediaId,
            url: asset.url || '',
            thumbnailUrl: asset.thumbnailUrl || asset.url || '',
              fileName: fileName,
            fileType: asset.fileType || '',
            fileSize: asset.fileSize || 0,
            uploadedAt: asset.uploadedAt ? new Date(asset.uploadedAt) : new Date(),
            usedInPosts: 0, // TODO: Get actual usage count from posts
            };
          })
          .filter((item) => {
            // Only keep items with valid ID and URL
            const idStr = String(item.id).trim();
            return idStr !== '' && 
                   idStr !== '00000000-0000-0000-0000-000000000000' && 
                   idStr !== 'undefined' && 
                   idStr !== 'null' &&
                   item.url && 
                   item.url.trim() !== '';
          });

        this.loggingService.debug(`Mapped ${items.length} valid media items from ${mediaAssets.length} assets`, { 
          itemsCount: items.length,
          assetsCount: mediaAssets.length,
          sampleItem: items[0],
          filteredOut: mediaAssets.length - items.length
        }, 'ContentLibrary');

        // Store all items
        this.allMediaItems.set(items);
        
        // Apply filters and pagination
        this.applyFiltersAndPagination();
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.loggingService.error('Failed to load media library', error, 'ContentLibrary');
        this.toastService.error('Failed to load media library. Please try again.');
        this.allMediaItems.set([]);
        this.mediaItems.set([]);
        this.totalItems.set(0);
        this.loading.set(false);
      },
    });
  }

  /**
   * Apply filters, sorting, and pagination
   */
  applyFiltersAndPagination(): void {
    let filtered = [...this.allMediaItems()];

    // Filter by type
    if (this.selectedFilter() === 'images') {
      filtered = filtered.filter((item) => item.fileType.startsWith('image/'));
    } else if (this.selectedFilter() === 'videos') {
      filtered = filtered.filter((item) => item.fileType.startsWith('video/'));
    }

    // Filter by search query
    if (this.searchQuery()) {
      const query = this.searchQuery().toLowerCase();
      filtered = filtered.filter((item) => item.fileName.toLowerCase().includes(query));
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

    // Filter out items with invalid/empty IDs to prevent duplicate key errors
    // But be less strict - only filter out truly invalid items
    filtered = filtered.filter((item) => {
      if (!item.id) return false;
      const idStr = String(item.id).trim();
      return idStr !== '' && idStr !== '00000000-0000-0000-0000-000000000000' && idStr !== 'undefined' && idStr !== 'null';
    });

    // Update total items
    this.totalItems.set(filtered.length);

    // Apply pagination
    const start = (this.currentPage() - 1) * this.pageSize();
    const end = start + this.pageSize();
    this.mediaItems.set(filtered.slice(start, end));
  }

  /**
   * Pagination controls
   */
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.applyFiltersAndPagination();
      // Scroll to top of media grid
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.goToPage(this.currentPage() + 1);
    }
  }

  previousPage(): void {
    if (this.currentPage() > 1) {
      this.goToPage(this.currentPage() - 1);
    }
  }

  changePageSize(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.applyFiltersAndPagination();
  }

  /**
   * Get page numbers for pagination display
   * Shows current page, first, last, and ellipsis if needed
   */
  getPageNumbers(): (number | string)[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: (number | string)[] = [];

    if (total <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (current > 3) {
        pages.push('...');
      }

      // Show pages around current
      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (current < total - 2) {
        pages.push('...');
      }

      // Always show last page
      pages.push(total);
    }

    return pages;
  }

  /**
   * Check if a page value is a number (not ellipsis)
   */
  isPageNumber(page: number | string): page is number {
    return typeof page === 'number';
  }

  /**
   * Handle page click - only called when page is a number
   */
  onPageClick(page: number | string): void {
    if (typeof page === 'number') {
      this.goToPage(page);
    }
  }

  // Expose Math for template
  Math = Math;

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

    // Use shared upload service
    this.mediaUploadService
      .uploadFile(file, (progress) => {
        this.uploadProgress.set(progress);
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (_response) => {
          this.uploading.set(false);
          this.uploadProgress.set(100);
          this.showUploadModal.set(false);
          this.toastService.success('Media uploaded successfully!');
          this.currentPage.set(1); // Reset to first page
          this.loadMediaLibrary();
          // Reset progress after a short delay
          setTimeout(() => {
            this.uploadProgress.set(0);
          }, 1000);
        },
        error: (_error) => {
          // Error is already handled by MediaUploadService
          this.uploading.set(false);
          this.uploadProgress.set(0);
        },
      });
  }

  deleteMedia(mediaId: string): void {
    this.confirmationService
      .confirm({
        title: 'Delete Media',
        message: 'Are you sure you want to delete this media? This action cannot be undone.',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        confirmButtonClass: 'bg-red-500 hover:bg-red-600',
      })
      .then((confirmed) => {
        if (confirmed) {
          this.mediaService
            .deleteMedia(mediaId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
            next: () => {
              this.toastService.success('Media deleted successfully');
              this.currentPage.set(1); // Reset to first page if needed
              this.loadMediaLibrary();
            },
            error: (_error: HttpErrorResponse) => {
              this.toastService.error('Failed to delete media. Please try again.');
            },
          });
        }
      });
  }


  useInPost(mediaId: string): void {
    // Check if we're in agency-client context
    const clientId = this.clientContextService.getCurrentClientId();
    const isAgencyClient = this.authService.isAgency() && clientId;

    // Build query params with media ID
    const queryParams: any = {
      tab: 'create',
      mediaId,
    };

    if (isAgencyClient) {
      // Navigate to agency-client content management
      this.router.navigate(['/agency/client', clientId, 'content-management'], { queryParams });
    } else {
      // Navigate to individual user content management
      this.router.navigate(['/dashboard/content-management'], { queryParams });
    }
  }

  formatFileSize(bytes: number): string {
    return this.mediaUploadService.formatFileSize(bytes);
  }
}
