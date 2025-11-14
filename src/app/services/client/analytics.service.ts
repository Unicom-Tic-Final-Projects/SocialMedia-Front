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
    return this.http.get<{ total: number }>(`${this.baseUrl}/posts`).pipe(
      map(({ total }) => ({
        totalPosts: total,
        totalEngagement: total * 12,
        followerGrowth: 18.5,
        conversionRate: 3.2
      })),
      catchError(() => of({
        totalPosts: 0,
        totalEngagement: 0,
        followerGrowth: 0,
        conversionRate: 0
      }))
    );
  }

  loadEngagementMetrics(): Observable<EngagementMetric[]> {
    return this.http.get<{ posts: any[] }>(`${this.baseUrl}/posts?limit=10`).pipe(
      map(({ posts }) => posts.map(post => ({
        title: post.title,
        impressions: post.views,
        clicks: Math.round(post.views * 0.3),
        engagementRate: Number((post.reactions / (post.views || 1) * 100).toFixed(2))
      })))
    );
  }

  loadPlatformPerformance(): Observable<PlatformPerformance[]> {
    return this.http.get<{ users: any[] }>(`${this.baseUrl}/users?limit=6`).pipe(
      map(({ users }) => users.map(user => ({
        platform: user.company?.department || 'Social',
        scheduled: user.age,
        published: user.age - 3,
        drafts: 3
      })))
    );
  }
}
