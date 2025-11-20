import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { API_BASE_URL } from '../../config/api.config';
import { PublishedPostResponse, SocialMediaPublishDetail } from '../../models/published-post.models';

@Injectable({
  providedIn: 'root'
})
export class PublishedPostsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  // State
  readonly publishedPosts = signal<PublishedPostResponse[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  /**
   * Get all published posts with social media details
   */
  getPublishedPosts(): Observable<PublishedPostResponse[]> {
    this.loading.set(true);
    this.error.set(null);

    return this.http.get<{ success: boolean; data: PublishedPostResponse[]; message?: string }>(
      `${this.baseUrl}/api/posts/published`
    ).pipe(
      map(response => {
        this.loading.set(false);
        if (response.success && response.data) {
          this.publishedPosts.set(response.data);
          return response.data;
        }
        throw new Error(response.message || 'Failed to load published posts');
      }),
      catchError(err => {
        this.loading.set(false);
        const errorMsg = err.error?.message || err.message || 'Failed to load published posts';
        this.error.set(errorMsg);
        return of([]);
      })
    );
  }

  /**
   * Get a specific published post by ID
   */
  getPublishedPostById(postId: string): Observable<PublishedPostResponse | null> {
    this.loading.set(true);
    this.error.set(null);

    return this.http.get<{ success: boolean; data: PublishedPostResponse; message?: string }>(
      `${this.baseUrl}/api/posts/published/${postId}`
    ).pipe(
      map(response => {
        this.loading.set(false);
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.message || 'Failed to load published post');
      }),
      catchError(err => {
        this.loading.set(false);
        const errorMsg = err.error?.message || err.message || 'Failed to load published post';
        this.error.set(errorMsg);
        return of(null);
      })
    );
  }

  /**
   * Get publish logs for a specific post
   */
  getPostPublishLogs(postId: string): Observable<SocialMediaPublishDetail[]> {
    return this.http.get<{ success: boolean; data: SocialMediaPublishDetail[]; message?: string }>(
      `${this.baseUrl}/api/posts/${postId}/publish-logs`
    ).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.message || 'Failed to load publish logs');
      }),
      catchError(err => {
        const errorMsg = err.error?.message || err.message || 'Failed to load publish logs';
        return of([]);
      })
    );
  }

  /**
   * Refresh published posts list
   */
  refresh(): void {
    this.getPublishedPosts().subscribe();
  }
}

