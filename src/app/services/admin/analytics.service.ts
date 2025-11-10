import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private baseUrl = 'https://jsonplaceholder.typicode.com';

  constructor(private http: HttpClient) {}

  getAnalyticsData(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/posts?_limit=10`);
  }

  getUserGrowthData(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/users`);
  }

  getPostPerformanceData(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/posts`);
  }

  getEngagementData(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/comments`);
  }

  getTrafficData(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/posts?_limit=5`);
  }

  getRevenueData(): Observable<any> {
    // Using mock endpoint for revenue analytics
    return this.http.get<any>(`${this.baseUrl}/posts/1`);
  }
}

