import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError, of, map } from 'rxjs';
import { API_BASE_URL } from '../../config/api.config';
import { ApiResponse } from '../../models/auth.models';

export interface UserSettingsDto {
  id: string;
  userId: string;
  
  // Appearance
  themeMode: 'light' | 'dark';
  colorTheme: 'blue' | 'purple' | 'pink';
  
  // General
  timezone: string;
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  timeFormat: '12' | '24';
  language: string;
  dashboardRefreshInterval: number;
  
  // Post Settings
  defaultPlatforms: string;
  autoSaveDrafts: boolean;
  autoSaveInterval: number;
  requireApprovalBeforePublishing: boolean;
  autoHashtagSuggestions: boolean;
  defaultHashtagCount: number;
  defaultSchedulingTime?: string;
  
  // Notifications
  emailNotificationsEnabled: boolean;
  emailPostApprovals: boolean;
  emailScheduledPosts: boolean;
  emailAccountConnections: boolean;
  emailPostPublished: boolean;
  inAppNotificationsEnabled: boolean;
  pushNotificationsEnabled: boolean;
  notificationFrequency: 'Immediate' | 'Daily' | 'Weekly' | 'Never';
  quietHoursStart?: string;
  quietHoursEnd?: string;
  
  // Analytics
  defaultAnalyticsDateRange: '1d' | '7d' | '30d' | '90d' | 'custom';
  autoRefreshAnalytics: boolean;
  analyticsRefreshInterval: number;
  defaultMetrics: string;
  
  // Social Account
  autoRefreshTokens: boolean;
  tokenRefreshBeforeExpiry: number;
  
  // Security
  twoFactorEnabled: boolean;
  sessionTimeoutMinutes: number;
  
  // AI
  aiContentSuggestionsEnabled: boolean;
  defaultAIModel: 'gpt-4' | 'gpt-3.5-turbo' | 'claude' | 'gemini';
  maxAISuggestionsPerRequest: number;
  
  createdAt: string;
  updatedAt?: string;
}

export interface UpdateUserSettingsRequest {
  // Appearance
  themeMode?: 'light' | 'dark';
  colorTheme?: 'blue' | 'purple' | 'pink';
  
  // General
  timezone?: string;
  dateFormat?: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  timeFormat?: '12' | '24';
  language?: string;
  dashboardRefreshInterval?: number;
  
  // Post Settings
  defaultPlatforms?: string;
  autoSaveDrafts?: boolean;
  autoSaveInterval?: number;
  requireApprovalBeforePublishing?: boolean;
  autoHashtagSuggestions?: boolean;
  defaultHashtagCount?: number;
  defaultSchedulingTime?: string;
  
  // Notifications
  emailNotificationsEnabled?: boolean;
  emailPostApprovals?: boolean;
  emailScheduledPosts?: boolean;
  emailAccountConnections?: boolean;
  emailPostPublished?: boolean;
  inAppNotificationsEnabled?: boolean;
  pushNotificationsEnabled?: boolean;
  notificationFrequency?: 'Immediate' | 'Daily' | 'Weekly' | 'Never';
  quietHoursStart?: string;
  quietHoursEnd?: string;
  
  // Analytics
  defaultAnalyticsDateRange?: '1d' | '7d' | '30d' | '90d' | 'custom';
  autoRefreshAnalytics?: boolean;
  analyticsRefreshInterval?: number;
  defaultMetrics?: string;
  
  // Social Account
  autoRefreshTokens?: boolean;
  tokenRefreshBeforeExpiry?: number;
  
  // Security
  twoFactorEnabled?: boolean;
  sessionTimeoutMinutes?: number;
  
  // AI
  aiContentSuggestionsEnabled?: boolean;
  defaultAIModel?: 'gpt-4' | 'gpt-3.5-turbo' | 'claude' | 'gemini';
  maxAISuggestionsPerRequest?: number;
}

@Injectable({
  providedIn: 'root'
})
export class UserSettingsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  private readonly settingsSignal = signal<UserSettingsDto | null>(null);
  readonly settings = this.settingsSignal.asReadonly();

  private readonly loadingSignal = signal(false);
  readonly loading = this.loadingSignal.asReadonly();

  private readonly errorSignal = signal<string | null>(null);
  readonly error = this.errorSignal.asReadonly();

  /**
   * Get current user's settings
   */
  getUserSettings(): Observable<UserSettingsDto> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.get<ApiResponse<UserSettingsDto>>(`${this.baseUrl}/api/usersettings`).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.settingsSignal.set(response.data);
        }
        this.loadingSignal.set(false);
      }),
      catchError((error) => {
        const errorMsg = error?.error?.message || error?.message || 'Failed to load settings';
        this.errorSignal.set(errorMsg);
        this.loadingSignal.set(false);
        return throwError(() => error);
      }),
      // Map to extract data from ApiResponse
      map((response) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.message || 'Invalid response format');
      })
    );
  }

  /**
   * Update user settings
   */
  updateUserSettings(request: UpdateUserSettingsRequest): Observable<UserSettingsDto> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.put<ApiResponse<UserSettingsDto>>(`${this.baseUrl}/api/usersettings`, request).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.settingsSignal.set(response.data);
        }
        this.loadingSignal.set(false);
      }),
      catchError((error) => {
        const errorMsg = error?.error?.message || error?.message || 'Failed to update settings';
        this.errorSignal.set(errorMsg);
        this.loadingSignal.set(false);
        return throwError(() => error);
      }),
      // Map to extract data from ApiResponse
      map((response) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.message || 'Invalid response format');
      })
    );
  }

  /**
   * Load settings from backend
   */
  loadSettings(): Observable<UserSettingsDto | null> {
    return this.getUserSettings().pipe(
      catchError(() => {
        // Return default settings if load fails
        const defaultSettings: UserSettingsDto = {
          id: '',
          userId: '',
          themeMode: 'dark',
          colorTheme: 'blue',
          timezone: 'UTC',
          dateFormat: 'MM/DD/YYYY',
          timeFormat: '12',
          language: 'en',
          dashboardRefreshInterval: 30,
          defaultPlatforms: '[]',
          autoSaveDrafts: true,
          autoSaveInterval: 60,
          requireApprovalBeforePublishing: false,
          autoHashtagSuggestions: true,
          defaultHashtagCount: 10,
          emailNotificationsEnabled: true,
          emailPostApprovals: true,
          emailScheduledPosts: false,
          emailAccountConnections: true,
          emailPostPublished: false,
          inAppNotificationsEnabled: true,
          pushNotificationsEnabled: false,
          notificationFrequency: 'Immediate',
          defaultAnalyticsDateRange: '7d',
          autoRefreshAnalytics: true,
          analyticsRefreshInterval: 300,
          defaultMetrics: '[]',
          autoRefreshTokens: true,
          tokenRefreshBeforeExpiry: 24,
          twoFactorEnabled: false,
          sessionTimeoutMinutes: 60,
          aiContentSuggestionsEnabled: true,
          defaultAIModel: 'gpt-4',
          maxAISuggestionsPerRequest: 3,
          createdAt: new Date().toISOString()
        };
        this.settingsSignal.set(defaultSettings);
        return of(defaultSettings);
      })
    );
  }
}

