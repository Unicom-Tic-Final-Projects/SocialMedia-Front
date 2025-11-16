import { DecimalPipe, NgFor, NgIf, TitleCasePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AnalyticsService } from '../../services/client/analytics.service';
import { ClientContextService } from '../../services/client/client-context.service';
import { AnalyticsSummary, EngagementMetric, PlatformPerformance } from '../../models/social.models';

@Component({
  selector: 'app-analytics-page',
  standalone: true,
  imports: [NgIf, NgFor, TitleCasePipe, DecimalPipe],
  templateUrl: './analytics-page.html',
  styleUrl: './analytics-page.css',
})
export class AnalyticsPage implements OnInit {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly route = inject(ActivatedRoute);
  readonly clientContextService = inject(ClientContextService);

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

    this.analyticsService.loadSummary().subscribe({
      next: (summary: AnalyticsSummary) => {
        console.log('[AnalyticsPage] Summary loaded:', summary);
        this.summary.set(summary);
        checkComplete();
      },
      error: (error) => {
        console.error('[AnalyticsPage] Error loading summary:', error);
        this.summary.set({
          totalPosts: 0,
          totalEngagement: 0,
          followerGrowth: 0,
          conversionRate: 0,
        });
        checkComplete();
      }
    });

    this.analyticsService.loadEngagementMetrics().subscribe({
      next: (metrics: EngagementMetric[]) => {
        console.log('[AnalyticsPage] Engagement metrics loaded:', metrics.length);
        this.engagement.set(metrics);
        checkComplete();
      },
      error: (error) => {
        console.error('[AnalyticsPage] Error loading engagement metrics:', error);
        this.engagement.set([]);
        checkComplete();
      }
    });

    this.analyticsService.loadPlatformPerformance().subscribe({
      next: (performance: PlatformPerformance[]) => {
        console.log('[AnalyticsPage] Platform performance loaded:', performance.length);
        this.platformPerformance.set(performance);
        checkComplete();
      },
      error: (error) => {
        console.error('[AnalyticsPage] Error loading platform performance:', error);
        this.platformPerformance.set([]);
        checkComplete();
      }
    });
  }
}
