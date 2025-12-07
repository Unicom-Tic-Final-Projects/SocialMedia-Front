import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

interface Post {
  id: number;
  title: string;
  body: string;
  userId: number;
}

interface User {
  id: number;
  name: string;
  email: string;
  username: string;
}

interface Comment {
  id: number;
  postId: number;
  name: string;
  email: string;
  body: string;
}

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'https://jsonplaceholder.typicode.com';

  getReports(): Observable<Post[]> {
    // Using posts as mock reports data
    return this.http.get<Post[]>(`${this.baseUrl}/posts?_limit=10`);
  }

  getReportById(id: number): Observable<Post> {
    return this.http.get<Post>(`${this.baseUrl}/posts/${id}`);
  }

  generateUserActivityReport(): Observable<User[]> {
    return this.http.get<User[]>(`${this.baseUrl}/users`);
  }

  generatePostPerformanceReport(): Observable<Post[]> {
    return this.http.get<Post[]>(`${this.baseUrl}/posts`);
  }

  generateAnalyticsReport(): Observable<Post[]> {
    return this.http.get<Post[]>(`${this.baseUrl}/posts?_limit=5`);
  }

  generateEngagementReport(): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${this.baseUrl}/comments`);
  }

  downloadReport(reportId: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/posts/${reportId}`, {
      responseType: 'blob',
    });
  }
}
