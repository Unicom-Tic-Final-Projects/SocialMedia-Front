import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private baseUrl = 'https://jsonplaceholder.typicode.com';

  constructor(private http: HttpClient) {}

  getReports(): Observable<any[]> {
    // Using posts as mock reports data
    return this.http.get<any[]>(`${this.baseUrl}/posts?_limit=10`);
  }

  getReportById(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/posts/${id}`);
  }

  generateUserActivityReport(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/users`);
  }

  generatePostPerformanceReport(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/posts`);
  }

  generateAnalyticsReport(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/posts?_limit=5`);
  }

  generateEngagementReport(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/comments`);
  }

  downloadReport(reportId: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/posts/${reportId}`, {
      responseType: 'blob'
    });
  }
}

