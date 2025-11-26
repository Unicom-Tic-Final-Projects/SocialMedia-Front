import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PublishedPostsService } from '../../services/client/published-posts.service';
import { PublishedPostResponse, SocialMediaPublishDetail } from '../../models/published-post.models';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmationService } from '../../core/services/confirmation.service';
import { PostsService } from '../../services/client/posts.service';

@Component({
  selector: 'app-published-posts',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './published-posts.html',
  styleUrl: './published-posts.css'
})
export class PublishedPostsComponent implements OnInit, OnDestroy {
  private readonly publishedPostsService = inject(PublishedPostsService);
  private readonly postsService = inject(PostsService);
  readonly router = inject(Router); // Made public for template access
  private readonly toastService = inject(ToastService);
  private readonly confirmationService = inject(ConfirmationService);

  // State
  readonly publishedPosts = signal<PublishedPostResponse[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  // Filters
  readonly searchQuery = signal('');
  readonly selectedPlatform = signal<string>('all');
  readonly selectedStatus = signal<'all' | 'Success' | 'Failed' | 'Pending'>('all');

  // Platform options
  readonly platforms = [
    { value: 'all', label: 'All Platforms', icon: 'fa-solid fa-globe' },
    { value: 'facebook', label: 'Facebook', icon: 'fa-brands fa-facebook' },
    { value: 'instagram', label: 'Instagram', icon: 'fa-brands fa-instagram' },
    { value: 'twitter', label: 'Twitter/X', icon: 'fa-brands fa-x-twitter' },
    { value: 'linkedin', label: 'LinkedIn', icon: 'fa-brands fa-linkedin' },
  ];

  // Status options
  readonly statusFilters = [
    { value: 'all' as const, label: 'All Status', icon: 'fa-solid fa-list' },
    { value: 'Success' as const, label: 'Success', icon: 'fa-solid fa-check-circle', color: 'text-green-600' },
    { value: 'Failed' as const, label: 'Failed', icon: 'fa-solid fa-times-circle', color: 'text-red-600' },
    { value: 'Pending' as const, label: 'Pending', icon: 'fa-solid fa-clock', color: 'text-yellow-600' },
  ];

  // Filtered posts
  readonly filteredPosts = computed(() => {
    let posts = [...this.publishedPosts()];
    const query = this.searchQuery().toLowerCase().trim();
    const platform = this.selectedPlatform();
    const status = this.selectedStatus();

    // Filter by search query
    if (query) {
      posts = posts.filter(post =>
        post.content.toLowerCase().includes(query) ||
        post.socialMediaDetails.some(detail => detail.platform.toLowerCase().includes(query))
      );
    }

    // Filter by platform
    if (platform !== 'all') {
      posts = posts.filter(post =>
        post.socialMediaDetails.some(detail => detail.platform.toLowerCase() === platform.toLowerCase())
      );
    }

    // Filter by status
    if (status !== 'all') {
      posts = posts.filter(post =>
        post.socialMediaDetails.some(detail => detail.status === status)
      );
    }

    return posts;
  });

  ngOnInit(): void {
    this.loadPublishedPosts();
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  loadPublishedPosts(): void {
    this.loading.set(true);
    this.error.set(null);

    this.publishedPostsService.getPublishedPosts().subscribe({
      next: (posts) => {
        this.publishedPosts.set(posts);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message || 'Failed to load published posts');
        this.loading.set(false);
        this.toastService.error('Failed to load published posts', err.message || 'Unknown error');
      }
    });
  }

  onSearchChange(): void {
    // Filtering is handled by computed property
  }

  setPlatformFilter(platform: string): void {
    this.selectedPlatform.set(platform);
  }

  setStatusFilter(status: 'all' | 'Success' | 'Failed' | 'Pending'): void {
    this.selectedStatus.set(status);
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.selectedPlatform.set('all');
    this.selectedStatus.set('all');
  }

  viewPost(post: PublishedPostResponse): void {
    this.router.navigate(['/dashboard/posts'], { queryParams: { id: post.id } });
  }

  editPost(post: PublishedPostResponse): void {
    this.router.navigate(['/dashboard/post-editor'], { queryParams: { postId: post.id, edit: 'true' } });
  }

  async deletePost(post: PublishedPostResponse): Promise<void> {
    const confirmed = await this.confirmationService.confirm({
      title: 'Delete Published Post',
      message: `Are you sure you want to delete this post? This will remove it from your posts list, but it will remain on social media platforms.`,
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });

    if (!confirmed) {
      return;
    }

    this.postsService.deletePost(post.id).subscribe({
      next: () => {
        this.toastService.success('Post deleted successfully');
        this.loadPublishedPosts();
      },
      error: (err) => {
        this.toastService.error('Failed to delete post', err.error?.message || err.message);
      }
    });
  }

  getPlatformIcon(platform: string): string {
    const platformMap: Record<string, string> = {
      facebook: 'fa-brands fa-facebook',
      instagram: 'fa-brands fa-instagram',
      twitter: 'fa-brands fa-x-twitter',
      linkedin: 'fa-brands fa-linkedin',
      youtube: 'fa-brands fa-youtube',
      tiktok: 'fa-brands fa-tiktok'
    };
    return platformMap[platform.toLowerCase()] || 'fa-solid fa-share';
  }

  getPlatformColor(platform: string): string {
    const colorMap: Record<string, string> = {
      facebook: 'text-blue-600',
      instagram: 'text-pink-600',
      twitter: 'text-black',
      linkedin: 'text-blue-700',
      youtube: 'text-red-600',
      tiktok: 'text-black'
    };
    return colorMap[platform.toLowerCase()] || 'text-gray-600';
  }

  getStatusColor(status: string): string {
    const colorMap: Record<string, string> = {
      'Success': 'text-green-600 bg-green-50 border-green-200',
      'Failed': 'text-red-600 bg-red-50 border-red-200',
      'Pending': 'text-yellow-600 bg-yellow-50 border-yellow-200'
    };
    return colorMap[status] || 'text-gray-600 bg-gray-50 border-gray-200';
  }

  openPlatformUrl(detail: SocialMediaPublishDetail): void {
    if (detail.platformUrl) {
      window.open(detail.platformUrl, '_blank', 'noopener,noreferrer');
    } else {
      this.toastService.warning('Platform URL not available. This post does not have a direct link to the platform.');
    }
  }

  getSuccessCount(post: PublishedPostResponse): number {
    return post.socialMediaDetails.filter(d => d.status === 'Success').length;
  }

  getFailedCount(post: PublishedPostResponse): number {
    return post.socialMediaDetails.filter(d => d.status === 'Failed').length;
  }

  getTotalPlatforms(post: PublishedPostResponse): number {
    return post.socialMediaDetails.length;
  }
}

