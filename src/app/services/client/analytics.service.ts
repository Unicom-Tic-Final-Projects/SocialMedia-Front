import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of } from 'rxjs';
import { AnalyticsSummary, EngagementMetric, PlatformPerformance } from '../../models/social.models';
import { API_BASE_URL } from '../../config/api.config';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private readonly baseUrl = inject(API_BASE_URL);

  constructor(private readonly http: HttpClient) {}

  loadSummary(): Observable<AnalyticsSummary> {
    // Use analytics top-performing endpoint as a proxy for summary
    return this.http.get<any>(`${this.baseUrl}/api/analytics/top-performing?limit=10`).pipe(
      map((response) => {
        const records = response?.data || response || [];
        const totalPosts = Array.isArray(records) ? records.length : 0;
        const totalEngagement = Array.isArray(records)
          ? records.reduce((sum: number, r: any) => sum + (r.totalEngagement || 0), 0)
          : 0;
        return {
          totalPosts,
          totalEngagement,
          followerGrowth: 18.5, // Placeholder - would need dedicated endpoint
          conversionRate: 3.2, // Placeholder - would need dedicated endpoint
        };
      }),
      catchError(() => of({
        totalPosts: 0,
        totalEngagement: 0,
        followerGrowth: 0,
        conversionRate: 0,
      }))
    );
  }

  loadEngagementMetrics(): Observable<EngagementMetric[]> {
    return this.http.get<any>(`${this.baseUrl}/api/analytics/top-performing?limit=10`).pipe(
      map((response) => {
        const records = response?.data || response || [];
        return Array.isArray(records)
          ? records.map((record: any) => ({
              title: record.postTitle || 'Post',
              impressions: record.impressions || 0,
              clicks: record.clicks || 0,
              engagementRate: record.engagementRate || 0,
            }))
          : [];
      }),
      catchError(() => of([]))
    );
  }

  loadPlatformPerformance(): Observable<PlatformPerformance[]> {
    // Placeholder - would need dedicated platform performance endpoint
    return of([
      { platform: 'Facebook', scheduled: 0, published: 0, drafts: 0 },
      { platform: 'Instagram', scheduled: 0, published: 0, drafts: 0 },
      { platform: 'LinkedIn', scheduled: 0, published: 0, drafts: 0 },
      { platform: 'Twitter', scheduled: 0, published: 0, drafts: 0 },
      { platform: 'YouTube', scheduled: 0, published: 0, drafts: 0 },
    ]);
  }
}
