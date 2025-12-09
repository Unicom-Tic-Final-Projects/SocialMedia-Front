import { DatePipe, DecimalPipe, TitleCasePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntil } from 'rxjs/operators';
import { AnalyticsService } from '../../services/client/analytics.service';
import { ClientContextService } from '../../services/client/client-context.service';
import { LoggingService } from '../../core/services/logging.service';
import { BaseComponent } from '../../core/base/base.component';
import {
  AnalyticsSummary,
  EngagementMetric,
  PlatformPerformance,
  PostAnalytics,
} from '../../models/social.models';

@Component({
  selector: 'app-analytics-page',
  standalone: true,
  imports: [DatePipe, TitleCasePipe, DecimalPipe],
  templateUrl: './analytics-page.html',
  styleUrl: './analytics-page.css',
})
export class AnalyticsPage extends BaseComponent implements OnInit {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly route = inject(ActivatedRoute);
  readonly clientContextService = inject(ClientContextService);
  private readonly loggingService = inject(LoggingService);

  loading = signal(true);
  summary = signal<AnalyticsSummary | null>(null);
  engagement = signal<EngagementMetric[]>([]);
  platformPerformance = signal<PlatformPerformance[]>([]);
  postAnalytics = signal<PostAnalytics[]>([]);
  refreshingPosts = signal<Set<string>>(new Set());

  // Client context
  readonly isViewingClient = this.clientContextService.isViewingClientDashboard;
  readonly selectedClient = this.clientContextService.selectedClient;

  async ngOnInit(): Promise<void> {
    // Extract clientId from route if available
    let route = this.route;
    while (route.firstChild) {
      route = route.firstChild;
    }

    // Check parent routes for clientId
    let parentRoute = this.route.parent;
    while (parentRoute) {
      const clientId = parentRoute.snapshot.params['clientId'];
      if (clientId) {
        await this.clientContextService.initializeFromRoute(clientId);
        break;
      }
      parentRoute = parentRoute.parent;
    }

    this.loading.set(true);

    // Load all analytics data with proper error handling
    let completedRequests = 0;
    const totalRequests = 4;

    const checkComplete = () => {
      completedRequests++;
      if (completedRequests >= totalRequests) {
        // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
        setTimeout(() => {
          this.loading.set(false);
        }, 0);
      }
    };

    this.analyticsService
      .loadSummary()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (summary: AnalyticsSummary) => {
          this.loggingService.info('Summary loaded', summary, 'AnalyticsPage');
          this.summary.set(summary);
          checkComplete();
        },
        error: (error) => {
          this.loggingService.error('Error loading summary', error, 'AnalyticsPage');
        this.summary.set({
          totalPosts: 0,
          totalEngagement: 0,
          followerGrowth: 0,
          conversionRate: 0,
        });
        checkComplete();
      },
    });

    this.analyticsService
      .loadEngagementMetrics()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (metrics: EngagementMetric[]) => {
          this.loggingService.info(`Engagement metrics loaded: ${metrics.length}`, { count: metrics.length }, 'AnalyticsPage');
          this.engagement.set(metrics);
          checkComplete();
        },
        error: (error) => {
          this.loggingService.error('Error loading engagement metrics', error, 'AnalyticsPage');
        this.engagement.set([]);
        checkComplete();
      },
    });

    this.analyticsService
      .loadPlatformPerformance()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (performance: PlatformPerformance[]) => {
          this.loggingService.info(`Platform performance loaded: ${performance.length}`, { count: performance.length }, 'AnalyticsPage');
          this.platformPerformance.set(performance);
          checkComplete();
        },
        error: (error) => {
          this.loggingService.error('Error loading platform performance', error, 'AnalyticsPage');
        this.platformPerformance.set([]);
        checkComplete();
      },
    });

    // Load post-by-post analytics
    this.analyticsService
      .loadPostAnalytics(1, 100)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (analytics: PostAnalytics[]) => {
          this.loggingService.info(`Post analytics loaded: ${analytics.length}`, { count: analytics.length }, 'AnalyticsPage');
          this.postAnalytics.set(analytics);
          checkComplete();
        },
        error: (error) => {
          this.loggingService.error('Error loading post analytics', error, 'AnalyticsPage');
          this.postAnalytics.set([]);
          checkComplete();
        },
      });
  }

  refreshPost(postId: string, platform: string): void {
    const key = `${postId}-${platform}`;
    this.refreshingPosts.update(posts => {
      const newSet = new Set(posts);
      newSet.add(key);
      return newSet;
    });

    this.analyticsService.refreshPostAnalytics(postId, platform)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Reload post analytics after refresh
          this.analyticsService.loadPostAnalytics(1, 100)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (analytics: PostAnalytics[]) => {
                this.postAnalytics.set(analytics);
              },
            });
          
          this.refreshingPosts.update(posts => {
            const newSet = new Set(posts);
            newSet.delete(key);
            return newSet;
          });
        },
        error: (error) => {
          this.loggingService.error('Error refreshing post analytics', error, 'AnalyticsPage');
          this.refreshingPosts.update(posts => {
            const newSet = new Set(posts);
            newSet.delete(key);
            return newSet;
          });
        },
      });
  }

  isRefreshing(postId: string, platform: string): boolean {
    return this.refreshingPosts().has(`${postId}-${platform}`);
  }

  getPlatformIcon(platform: string): string {
    const icons: Record<string, string> = {
      facebook: 'fa-brands fa-facebook',
      instagram: 'fa-brands fa-instagram',
      twitter: 'fa-brands fa-twitter',
      linkedin: 'fa-brands fa-linkedin',
      youtube: 'fa-brands fa-youtube',
      tiktok: 'fa-brands fa-tiktok',
    };
    return icons[platform.toLowerCase()] || 'fa-solid fa-share-nodes';
  }

  getPlatformColor(platform: string): string {
    const colors: Record<string, string> = {
      facebook: 'text-blue-600',
      instagram: 'text-pink-600',
      twitter: 'text-blue-400',
      linkedin: 'text-blue-700',
      youtube: 'text-red-600',
      tiktok: 'text-black',
    };
    return colors[platform.toLowerCase()] || 'text-gray-600';
  }

}
