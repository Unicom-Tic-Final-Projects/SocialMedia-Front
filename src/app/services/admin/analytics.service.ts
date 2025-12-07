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
export class AnalyticsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'https://jsonplaceholder.typicode.com';

  getAnalyticsData(): Observable<Post[]> {
    return this.http.get<Post[]>(`${this.baseUrl}/posts?_limit=10`);
  }

  getUserGrowthData(): Observable<User[]> {
    return this.http.get<User[]>(`${this.baseUrl}/users`);
  }

  getPostPerformanceData(): Observable<Post[]> {
    return this.http.get<Post[]>(`${this.baseUrl}/posts`);
  }

  getEngagementData(): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${this.baseUrl}/comments`);
  }

  getTrafficData(): Observable<Post[]> {
    return this.http.get<Post[]>(`${this.baseUrl}/posts?_limit=5`);
  }

  getRevenueData(): Observable<Post> {
    // Using mock endpoint for revenue analytics
    return this.http.get<Post>(`${this.baseUrl}/posts/1`);
  }
}
