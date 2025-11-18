import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, map, Observable, of } from 'rxjs';
import { AnalyticsSummary, EngagementMetric, PlatformPerformance } from '../../models/social.models';
import { API_BASE_URL } from '../../config/api.config';
import { ClientContextService } from './client-context.service';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly clientContextService = inject(ClientContextService);

  constructor(private readonly http: HttpClient) {}

  loadSummary(): Observable<AnalyticsSummary> {
    // Check if viewing client dashboard and get client userId
    const clientUserId = this.clientContextService.getCurrentClientUserId();
    
    let apiCall: Observable<any>;
    
    if (clientUserId) {
      // Use records endpoint with userId for client dashboard
      let params = new HttpParams()
        .set('userId', clientUserId)
        .set('pageSize', '10')
        .set('pageNumber', '1')
        .set('sortBy', 'EngagementRate')
        .set('sortOrder', 'desc');
      
      apiCall = this.http.get<any>(`${this.baseUrl}/api/analytics/records`, { params });
    } else {
      // Use top-performing endpoint for regular dashboard (uses tenantId from JWT)
      apiCall = this.http.get<any>(`${this.baseUrl}/api/analytics/top-performing?limit=10`);
    }

    return apiCall.pipe(
      map((response) => {
        console.log('[AnalyticsService] Summary response:', response);
        const records = response?.data || response || [];
        const totalPosts = Array.isArray(records) ? records.length : 0;
        const totalEngagement = Array.isArray(records)
          ? records.reduce((sum: number, r: any) => sum + (r.totalEngagement || r.engagementRate || 0), 0)
          : 0;
        return {
          totalPosts,
          totalEngagement,
          followerGrowth: 18.5, // Placeholder - would need dedicated endpoint
          conversionRate: 3.2, // Placeholder - would need dedicated endpoint
        };
      }),
      catchError((error) => {
        console.error('[AnalyticsService] Error loading summary:', error);
        return of({
          totalPosts: 0,
          totalEngagement: 0,
          followerGrowth: 0,
          conversionRate: 0,
        });
      })
    );
  }

  loadEngagementMetrics(): Observable<EngagementMetric[]> {
    // Check if viewing client dashboard and get client userId
    const clientUserId = this.clientContextService.getCurrentClientUserId();
    
    let apiCall: Observable<any>;
    
    if (clientUserId) {
      // Use records endpoint with userId for client dashboard
      let params = new HttpParams()
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
        console.log('[AnalyticsService] Engagement metrics response:', response);
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
        console.error('[AnalyticsService] Error loading engagement metrics:', error);
        return of([]);
      })
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
