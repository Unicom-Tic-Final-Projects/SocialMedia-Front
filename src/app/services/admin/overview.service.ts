import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../config/api.config';
import { ApiResponse } from '../../models/auth.models';

export interface AdminOverviewResponse {
  totalUsers: number;
  totalTenants: number;
  activeUsers: number;
  totalPosts: number;
  publishedPosts: number;
  draftPosts: number;
  scheduledPosts: number;
  totalSocialAccounts: number;
  activeSocialAccounts: number;
  individualTenants: number;
  agencyTenants: number;
  systemTenants: number;
}

@Injectable({ providedIn: 'root' })
export class OverviewService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  getOverviewData(): Observable<ApiResponse<AdminOverviewResponse>> {
    return this.http.get<ApiResponse<AdminOverviewResponse>>(`${this.baseUrl}/api/admin/overview`);
  }
}

