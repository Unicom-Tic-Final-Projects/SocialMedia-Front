import { DecimalPipe, NgFor, NgIf, TitleCasePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { AnalyticsService } from '../../services/client/analytics.service';
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

  loading = true;
  summary = signal<AnalyticsSummary | null>(null);
  engagement = signal<EngagementMetric[]>([]);
  platformPerformance = signal<PlatformPerformance[]>([]);

  ngOnInit(): void {
    this.loading = true;
    this.analyticsService.loadSummary().subscribe((summary: AnalyticsSummary) => this.summary.set(summary));
    this.analyticsService.loadEngagementMetrics().subscribe((metrics: EngagementMetric[]) => this.engagement.set(metrics));
    this.analyticsService.loadPlatformPerformance().subscribe((performance: PlatformPerformance[]) => {
      this.platformPerformance.set(performance);
      this.loading = false;
    });
  }
}
