import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, map, Observable, of } from 'rxjs';
import {
  AnalyticsSummary,
  EngagementMetric,
  PlatformPerformance,
  PostAnalytics,
} from '../../models/social.models';
import { API_BASE_URL } from '../../config/api.config';
import { ClientContextService } from './client-context.service';
import { LoggingService } from '../../core/services/logging.service';
import { AuthService } from '../../core/services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class AnalyticsService {
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly clientContextService = inject(ClientContextService);
  private readonly http = inject(HttpClient);
  private readonly loggingService = inject(LoggingService);
  private readonly authService = inject(AuthService);

  loadSummary(): Observable<AnalyticsSummary> {
    // Check if viewing client dashboard and get client userId
    const clientUserId = this.clientContextService.getCurrentClientUserId();
    const user = this.authService.user();
    const tenantId = user?.tenantId;

    const params = new HttpParams()
      .set('pageSize', '1000') // Get all records for accurate summary
      .set('pageNumber', '1')
      .set('sortBy', 'PublishedAt')
      .set('sortOrder', 'desc');

    // Backend requires PostId, TenantId, or UserId - prioritize userId if client context, otherwise use tenantId
    if (clientUserId) {
      params.set('userId', clientUserId);
    } else if (tenantId) {
      params.set('tenantId', tenantId);
    }

    return this.http.get<any>(`${this.baseUrl}/api/analytics/records`, { params }).pipe(
      map((response) => {
        this.loggingService.debug('Summary response', response, 'AnalyticsService');
        const records = response?.data || response || [];
        const recordsArray = Array.isArray(records) ? records : [];
        
        // Calculate totals from actual analytics records
        const totalPosts = recordsArray.length;
        const totalEngagement = recordsArray.reduce(
          (sum: number, r: any) => {
            const engagement = (r.likes || 0) + (r.comments || 0) + (r.shares || 0) + (r.retweets || 0);
            return sum + engagement;
          },
          0,
        );
        
        // Calculate average engagement rate
        const totalEngagementRate = recordsArray.reduce(
          (sum: number, r: any) => sum + (r.engagementRate || 0),
          0,
        );
        const avgEngagementRate = totalPosts > 0 ? totalEngagementRate / totalPosts : 0;
        
        return {
          totalPosts,
          totalEngagement,
          followerGrowth: 18.5, // Placeholder - would need dedicated endpoint
          conversionRate: avgEngagementRate, // Use average engagement rate as conversion rate
        };
      }),
      catchError((error) => {
        this.loggingService.error('Error loading summary', error, 'AnalyticsService');
        return of({
          totalPosts: 0,
          totalEngagement: 0,
          followerGrowth: 0,
          conversionRate: 0,
        });
      }),
    );
  }

  loadEngagementMetrics(): Observable<EngagementMetric[]> {
    // Check if viewing client dashboard and get client userId
    const clientUserId = this.clientContextService.getCurrentClientUserId();

    let apiCall: Observable<any>;

    if (clientUserId) {
      // Use records endpoint with userId for client dashboard
      const params = new HttpParams()
        .set('userId', clientUserId)
        .set('pageSize', '10')
        .set('pageNumber', '1')
        .set('sortBy', 'EngagementRate')
        .set('sortOrder', 'desc');

      apiCall = this.http.get<any>(`${this.baseUrl}/api/analytics/records`, { params });
    } else {
      // Use top-performing endpoint for regular dashboard
      apiCall = this.http.get<any>(`${this.baseUrl}/api/analytics/top-performing?limit=10`);
    }

    return apiCall.pipe(
      map((response) => {
        this.loggingService.debug('Engagement metrics response', response, 'AnalyticsService');
        const records = response?.data || response || [];
        return Array.isArray(records)
          ? records.map((record: any) => ({
              title: record.postTitle || record.title || 'Post',
              impressions: record.impressions || 0,
              clicks: record.clicks || 0,
              engagementRate: record.engagementRate || 0,
            }))
          : [];
      }),
      catchError((error) => {
        this.loggingService.error('Error loading engagement metrics', error, 'AnalyticsService');
        return of([]);
      }),
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

  loadPostAnalytics(pageNumber: number = 1, pageSize: number = 50): Observable<PostAnalytics[]> {
    const clientUserId = this.clientContextService.getCurrentClientUserId();
    const user = this.authService.user();
    const tenantId = user?.tenantId;
    
    const params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString())
      .set('sortBy', 'PublishedAt')
      .set('sortOrder', 'desc');

    // Backend requires PostId, TenantId, or UserId - prioritize userId if client context, otherwise use tenantId
    if (clientUserId) {
      params.set('userId', clientUserId);
    } else if (tenantId) {
      params.set('tenantId', tenantId);
    }

    return this.http.get<any>(`${this.baseUrl}/api/analytics/records`, { params }).pipe(
      map((response) => {
        this.loggingService.debug('Post analytics response', response, 'AnalyticsService');
        const records = response?.data || response || [];
        return Array.isArray(records)
          ? records.map((record: any) => ({
              id: record.id,
              postId: record.postId,
              platform: record.platform,
              platformPostId: record.platformPostId,
              platformUrl: record.platformUrl,
              likes: record.likes || 0,
              comments: record.comments || 0,
              shares: record.shares || 0,
              retweets: record.retweets || 0,
              saves: record.saves || 0,
              views: record.views || 0,
              clicks: record.clicks || 0,
              impressions: record.impressions || 0,
              reach: record.reach || 0,
              engagementRate: record.engagementRate || 0,
              publishedAt: record.publishedAt,
              lastEngagementAt: record.lastEngagementAt,
              updatedAt: record.updatedAt || record.createdAt,
            }))
          : [];
      }),
      catchError((error) => {
        this.loggingService.error('Error loading post analytics', error, 'AnalyticsService');
        return of([]);
      }),
    );
  }

  refreshPostAnalytics(postId: string, platform: string): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/api/analytics/refresh/${postId}?platform=${platform}`,
      {}
    ).pipe(
      catchError((error) => {
        this.loggingService.error('Error refreshing post analytics', error, 'AnalyticsService');
        throw error;
      }),
    );
  }
}
