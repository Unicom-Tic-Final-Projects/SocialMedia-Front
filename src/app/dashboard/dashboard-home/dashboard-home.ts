import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { PostsService } from '../../services/client/posts.service';
import { NotificationsService } from '../../services/client/notifications.service';
import { SocialPost, PostStatus } from '../../models/post.models';
import { NotificationItem } from '../../models/social.models';

interface DashboardStats {
  totalPosts: number;
  published: number;
  pending: number;
  drafts: number;
}

@Component({
  selector: 'app-dashboard-home',
  imports: [CommonModule],
  templateUrl: './dashboard-home.html',
  styleUrl: './dashboard-home.css',
})
export class DashboardHome implements OnInit {
  private readonly postsService = inject(PostsService);
  private readonly notificationsService = inject(NotificationsService);

  loading = signal(false);
  stats = signal<DashboardStats>({
    totalPosts: 0,
    published: 0,
    pending: 0,
    drafts: 0,
  });
  recentActivity = signal<NotificationItem[]>([]);

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loading.set(true);

    // Fetch posts by different statuses
    const statuses: PostStatus[] = ['Draft', 'Scheduled', 'Published', 'PendingApproval', 'Approved'];
    
    const postRequests = statuses.map(status =>
      this.postsService.getPostsByStatus(status).pipe(
        catchError(() => of([] as SocialPost[]))
      )
    );

    // Fetch recent notifications
    const notificationsRequest = this.notificationsService.refresh(5).pipe(
      catchError(() => of([] as NotificationItem[]))
    );

    forkJoin({
      posts: forkJoin(postRequests),
      notifications: notificationsRequest,
    }).subscribe({
      next: ({ posts, notifications }) => {
        // Flatten all posts from different statuses
        const allPosts = posts.flat();
        
        // Calculate statistics
        const stats: DashboardStats = {
          totalPosts: allPosts.length,
          published: allPosts.filter(p => p.status === 'Published').length,
          pending: allPosts.filter(p => p.status === 'PendingApproval' || p.status === 'Scheduled').length,
          drafts: allPosts.filter(p => p.status === 'Draft').length,
        };

        this.stats.set(stats);
        this.recentActivity.set(notifications.slice(0, 5));
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading dashboard data:', error);
        this.loading.set(false);
      }
    });
  }

  getSuccessRate(): number {
    const stats = this.stats();
    if (stats.totalPosts === 0) return 0;
    return Math.round((stats.published / stats.totalPosts) * 100);
  }

  getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    } else if (diffInSeconds < 172800) {
      return 'Yesterday';
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    }
  }

  getActivityIcon(type: string): string {
    switch (type) {
      case 'comment':
        return 'fa-comment';
      case 'mention':
        return 'fa-at';
      case 'system':
        return 'fa-bell';
      default:
        return 'fa-info-circle';
    }
  }

  getActivityMessage(notification: NotificationItem): string {
    return notification.message || notification.source;
  }
}
