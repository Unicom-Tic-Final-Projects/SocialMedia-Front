import { DecimalPipe, TitleCasePipe } from '@angular/common';
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
} from '../../models/social.models';

@Component({
  selector: 'app-analytics-page',
  standalone: true,
  imports: [TitleCasePipe, DecimalPipe],
  templateUrl: './analytics-page.html',
  styleUrl: './analytics-page.css',
})
export class AnalyticsPage extends BaseComponent implements OnInit {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly route = inject(ActivatedRoute);
  readonly clientContextService = inject(ClientContextService);
  private readonly loggingService = inject(LoggingService);

  loading = true;
  summary = signal<AnalyticsSummary | null>(null);
  engagement = signal<EngagementMetric[]>([]);
  platformPerformance = signal<PlatformPerformance[]>([]);

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

    this.loading = true;

    // Load all analytics data with proper error handling
    let completedRequests = 0;
    const totalRequests = 3;

    const checkComplete = () => {
      completedRequests++;
      if (completedRequests >= totalRequests) {
        this.loading = false;
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
  }

}
