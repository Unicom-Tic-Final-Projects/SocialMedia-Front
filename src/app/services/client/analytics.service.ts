import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, map, Observable, of, forkJoin } from 'rxjs';
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
import { PostsService } from './posts.service';

@Injectable({
  providedIn: 'root',
})
export class AnalyticsService {
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly clientContextService = inject(ClientContextService);
  private readonly http = inject(HttpClient);
  private readonly loggingService = inject(LoggingService);
  private readonly authService = inject(AuthService);
  private readonly postsService = inject(PostsService);

  // Focus platforms: LinkedIn, X (Twitter), YouTube
  private readonly focusPlatforms = ['LinkedIn', 'Twitter', 'X', 'YouTube'];

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
        
        // Filter to only focus platforms: LinkedIn, X (Twitter), YouTube
        const filteredRecords = recordsArray.filter((r: any) => {
          const platform = (r.platform || '').toLowerCase();
          return platform === 'linkedin' || platform === 'twitter' || platform === 'x' || platform === 'youtube';
        });
        
        // Calculate totals from filtered analytics records
        const totalPosts = filteredRecords.length;
        const totalEngagement = filteredRecords.reduce(
          (sum: number, r: any) => {
            const engagement = (r.likes || 0) + (r.comments || 0) + (r.shares || 0) + (r.retweets || 0);
            return sum + engagement;
          },
          0,
        );
        
        // Calculate average engagement rate
        const totalEngagementRate = filteredRecords.reduce(
          (sum: number, r: any) => sum + (r.engagementRate || 0),
          0,
        );
        const avgEngagementRate = totalPosts > 0 ? totalEngagementRate / totalPosts : 0;
        
        // Calculate follower growth dynamically from analytics records
        // Compare current period (last 30 days) vs previous period (30-60 days ago)
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        
        const currentPeriodRecords = filteredRecords.filter((r: any) => {
          if (!r.publishedAt) return false;
          const publishedDate = new Date(r.publishedAt);
          return publishedDate >= thirtyDaysAgo;
        });
        
        const previousPeriodRecords = filteredRecords.filter((r: any) => {
          if (!r.publishedAt) return false;
          const publishedDate = new Date(r.publishedAt);
          return publishedDate >= sixtyDaysAgo && publishedDate < thirtyDaysAgo;
        });
        
        // Calculate average reach/impressions per post for growth calculation
        const currentPeriodAvgReach = currentPeriodRecords.length > 0
          ? currentPeriodRecords.reduce((sum: number, r: any) => sum + (r.reach || r.impressions || 0), 0) / currentPeriodRecords.length
          : 0;
        
        const previousPeriodAvgReach = previousPeriodRecords.length > 0
          ? previousPeriodRecords.reduce((sum: number, r: any) => sum + (r.reach || r.impressions || 0), 0) / previousPeriodRecords.length
          : 0;
        
        // Calculate growth percentage
        const followerGrowth = previousPeriodAvgReach > 0
          ? ((currentPeriodAvgReach - previousPeriodAvgReach) / previousPeriodAvgReach) * 100
          : currentPeriodAvgReach > 0 ? 100 : 0;
        
        return {
          totalPosts,
          totalEngagement,
          followerGrowth: Math.round(followerGrowth * 10) / 10, // Round to 1 decimal place
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
        .set('pageSize', '1000') // Get more records to filter
        .set('pageNumber', '1')
        .set('sortBy', 'EngagementRate')
        .set('sortOrder', 'desc');

      apiCall = this.http.get<any>(`${this.baseUrl}/api/analytics/records`, { params });
    } else {
      // Use top-performing endpoint for regular dashboard
      apiCall = this.http.get<any>(`${this.baseUrl}/api/analytics/top-performing?limit=1000`);
    }

    return apiCall.pipe(
      map((response) => {
        this.loggingService.debug('Engagement metrics response', response, 'AnalyticsService');
        const records = response?.data || response || [];
        const recordsArray = Array.isArray(records) ? records : [];
        
        // Filter to only focus platforms: LinkedIn, X (Twitter), YouTube
        const filteredRecords = recordsArray
          .filter((record: any) => {
            const platform = (record.platform || '').toLowerCase();
            return platform === 'linkedin' || platform === 'twitter' || platform === 'x' || platform === 'youtube';
          })
          .slice(0, 10); // Get top 10 after filtering
        
        return filteredRecords.map((record: any) => ({
          title: record.postTitle || record.title || 'Post',
          impressions: record.impressions || 0,
          clicks: record.clicks || 0,
          engagementRate: record.engagementRate || 0,
        }));
      }),
      catchError((error) => {
        this.loggingService.error('Error loading engagement metrics', error, 'AnalyticsService');
        return of([]);
      }),
    );
  }

  loadPlatformPerformance(): Observable<PlatformPerformance[]> {
    // Get posts data dynamically from posts service
    const clientUserId = this.clientContextService.getCurrentClientUserId();
    const user = this.authService.user();
    
    // Fetch posts by different statuses
    const draftPosts$ = this.postsService.getPostsByStatus('Draft');
    const scheduledPosts$ = this.postsService.getPostsByStatus('Scheduled');
    const publishedPosts$ = this.postsService.getPostsByStatus('Published');
    
    return forkJoin({
      drafts: draftPosts$,
      scheduled: scheduledPosts$,
      published: publishedPosts$,
    }).pipe(
      map(({ drafts, scheduled, published }) => {
        // Combine all posts
        const allPosts = [...drafts, ...scheduled, ...published];
        
        // Helper function to normalize platform names
        const normalizePlatform = (platform: string): string => {
          const normalized = platform.toLowerCase();
          if (normalized === 'x' || normalized === 'twitter') return 'X';
          if (normalized === 'linkedin') return 'LinkedIn';
          if (normalized === 'youtube') return 'YouTube';
          return platform;
        };
        
        // Helper function to check if platform is in focus list
        const isFocusPlatform = (platform: string): boolean => {
          const normalized = normalizePlatform(platform);
          return normalized === 'LinkedIn' || normalized === 'X' || normalized === 'YouTube';
        };
        
        // Initialize platform performance map (only for focus platforms)
        const platformMap = new Map<string, { scheduled: number; published: number; drafts: number }>();
        platformMap.set('LinkedIn', { scheduled: 0, published: 0, drafts: 0 });
        platformMap.set('X', { scheduled: 0, published: 0, drafts: 0 });
        platformMap.set('YouTube', { scheduled: 0, published: 0, drafts: 0 });
        
        // Count posts by platform and status
        allPosts.forEach((post) => {
          // Get platforms from SocialPost (already mapped from postTargets)
          const platforms = post.platforms || [];
          
          platforms.forEach((platform) => {
            if (!isFocusPlatform(platform)) return; // Skip non-focus platforms
            
            const normalizedPlatform = normalizePlatform(platform);
            const platformData = platformMap.get(normalizedPlatform) || { scheduled: 0, published: 0, drafts: 0 };
            
            if (post.status === 'Draft') {
              platformData.drafts++;
            } else if (post.status === 'Scheduled') {
              platformData.scheduled++;
            } else if (post.status === 'Published') {
              platformData.published++;
            }
            
            platformMap.set(normalizedPlatform, platformData);
          });
        });
        
        // Convert map to array
        return Array.from(platformMap.entries()).map(([platform, data]) => ({
          platform,
          scheduled: data.scheduled,
          published: data.published,
          drafts: data.drafts,
        }));
      }),
      catchError((error) => {
        this.loggingService.error('Error loading platform performance', error, 'AnalyticsService');
        // Return empty data for focus platforms on error
        return of([
          { platform: 'LinkedIn', scheduled: 0, published: 0, drafts: 0 },
          { platform: 'X', scheduled: 0, published: 0, drafts: 0 },
          { platform: 'YouTube', scheduled: 0, published: 0, drafts: 0 },
        ]);
      }),
    );
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
        const recordsArray = Array.isArray(records) ? records : [];
        
        // Filter to only focus platforms: LinkedIn, X (Twitter), YouTube
        const filteredRecords = recordsArray.filter((record: any) => {
          const platform = (record.platform || '').toLowerCase();
          return platform === 'linkedin' || platform === 'twitter' || platform === 'x' || platform === 'youtube';
        });
        
        return filteredRecords.map((record: any) => ({
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
        }));
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

  /**
   * Get analytics for a specific date range
   */
  getAnalyticsByDateRange(startDate: string, endDate: string): Observable<any> {
    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);
    return this.http.get<any>(`${this.baseUrl}/api/analytics/date-range`, { params }).pipe(
      catchError((error) => {
        this.loggingService.error('Error loading analytics by date range', error, 'AnalyticsService');
        return of(null);
      }),
    );
  }

  /**
   * Get analytics comparison between two periods
   */
  getAnalyticsComparison(period1Start: string, period1End: string, period2Start: string, period2End: string): Observable<any> {
    const params = new HttpParams()
      .set('period1Start', period1Start)
      .set('period1End', period1End)
      .set('period2Start', period2Start)
      .set('period2End', period2End);
    return this.http.get<any>(`${this.baseUrl}/api/analytics/comparison`, { params }).pipe(
      catchError((error) => {
        this.loggingService.error('Error loading analytics comparison', error, 'AnalyticsService');
        return of(null);
      }),
    );
  }

  /**
   * Get platform-specific analytics
   */
  getPlatformAnalytics(platform: string, startDate?: string, endDate?: string): Observable<any> {
    let params = new HttpParams().set('platform', platform);
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    return this.http.get<any>(`${this.baseUrl}/api/analytics/platform`, { params }).pipe(
      catchError((error) => {
        this.loggingService.error('Error loading platform analytics', error, 'AnalyticsService');
        return of(null);
      }),
    );
  }

  /**
   * Get top performing posts
   */
  getTopPerformingPosts(limit: number = 10, metric: string = 'engagement'): Observable<any> {
    const params = new HttpParams()
      .set('limit', limit.toString())
      .set('metric', metric);
    return this.http.get<any>(`${this.baseUrl}/api/analytics/top-performing`, { params }).pipe(
      catchError((error) => {
        this.loggingService.error('Error loading top performing posts', error, 'AnalyticsService');
        return of([]);
      }),
    );
  }

  /**
   * Export analytics data
   */
  exportAnalytics(format: 'csv' | 'xlsx' | 'json', filters?: any): Observable<Blob> {
    let params = new HttpParams().set('format', format);
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key]) params = params.set(key, filters[key]);
      });
    }
    return this.http.get(`${this.baseUrl}/api/analytics/export`, { params, responseType: 'blob' }).pipe(
      catchError((error) => {
        this.loggingService.error('Error exporting analytics', error, 'AnalyticsService');
        throw error;
      }),
    );
  }
}
