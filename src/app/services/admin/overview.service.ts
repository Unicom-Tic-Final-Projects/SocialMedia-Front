import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class OverviewService {
  private baseUrl = 'https://jsonplaceholder.typicode.com';

  constructor(private http: HttpClient) {}

  getOverviewData(): Observable<any> {
    // Fetch multiple endpoints to build overview data
    return this.http.get<any>(`${this.baseUrl}/posts?_limit=5`);
  }

  getTotalUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/users`);
  }

  getTotalPosts(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/posts`);
  }

  getTotalComments(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/comments`);
  }

  getMetrics(): Observable<any> {
    // Combine multiple data sources for metrics
    return this.http.get<any>(`${this.baseUrl}/posts?_limit=1`);
  }
}

