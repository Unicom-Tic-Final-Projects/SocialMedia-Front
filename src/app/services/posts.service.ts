import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, tap, catchError, throwError } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { AuthService } from '../core/services/auth.service';
import { 
  PostResponse, 
  CreatePostRequest, 
  UpdatePostRequest, 
  SchedulePostRequest,
  SocialPost,
  PostStatus 
} from '../models/post.models';
import { PostDraft } from '../models/social.models';

@Injectable({
  providedIn: 'root'
})
export class PostsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly authService = inject(AuthService);

  private readonly postsSignal = signal<SocialPost[]>([]);
  readonly posts = this.postsSignal.asReadonly();

  private readonly loadingSignal = signal(false);
  readonly loading = this.loadingSignal.asReadonly();

  private readonly errorSignal = signal<string | null>(null);
  readonly error = this.errorSignal.asReadonly();

  private readonly draftsSignal = signal<PostDraft[]>([]);
  readonly drafts = this.draftsSignal.asReadonly();

  /**
   * Get posts by status (Draft, Scheduled, Published, etc.)
   */
  getPostsByStatus(status: PostStatus): Observable<SocialPost[]> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.get<PostResponse[]>(`${this.baseUrl}/api/content/posts/status/${status}`).pipe(
      map((posts) => posts.map((post) => this.mapPostResponse(post))),
      tap((posts) => {
        this.postsSignal.set(posts);
        this.loadingSignal.set(false);
      }),
      catchError((error) => {
        this.errorSignal.set(error?.userMessage || 'Failed to load posts');
        this.loadingSignal.set(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get posts by client ID (for agencies)
   */
  getPostsByClientId(clientId: string): Observable<SocialPost[]> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.get<PostResponse[]>(`${this.baseUrl}/api/content/posts/client/${clientId}`).pipe(
      map((posts) => posts.map((post) => this.mapPostResponse(post))),
      tap((posts) => {
        this.postsSignal.set(posts);
        this.loadingSignal.set(false);
      }),
      catchError((error) => {
        this.errorSignal.set(error?.userMessage || 'Failed to load posts');
        this.loadingSignal.set(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get all posts
   * Note: Backend requires ClientId, so for Individual users we use status-based fetching
   * For Agencies, use getPostsByClientId() with a specific client ID
   */
  refreshPosts(): Observable<SocialPost[]> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    const user = this.authService.user();
    
    if (!user) {
      this.loadingSignal.set(false);
      return throwError(() => new Error('User not authenticated'));
    }

    // For now, get posts by status 'Draft' as default
    // TODO: When client management is implemented:
    // - Individual users: Use TenantId as ClientId
    // - Agencies: Use selected ClientId or get all clients' posts
    return this.getPostsByStatus('Draft').pipe(
      tap(() => this.loadingSignal.set(false))
    );
  }

  /**
   * Get all posts by fetching multiple statuses and combining
   */
  getAllPosts(): Observable<SocialPost[]> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    const statuses: PostStatus[] = ['Draft', 'Scheduled', 'Published', 'PendingApproval', 'Approved'];
    
    // Fetch all statuses and combine
    // For MVP, we'll just get Draft posts
    // TODO: Implement proper fetching of all statuses and combining
    return this.getPostsByStatus('Draft');
  }

  /**
   * Get a single post by ID
   */
  getPost(id: string): Observable<SocialPost> {
    return this.http.get<PostResponse>(`${this.baseUrl}/api/content/posts/${id}`).pipe(
      map((post) => this.mapPostResponse(post))
    );
  }

  /**
   * Create a new post
   */
  createPost(request: CreatePostRequest): Observable<SocialPost> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.post<PostResponse>(`${this.baseUrl}/api/content/posts`, request).pipe(
      map((post) => this.mapPostResponse(post)),
      tap((post) => {
        this.postsSignal.update((posts) => [post, ...posts]);
        this.loadingSignal.set(false);
      }),
      catchError((error) => {
        this.errorSignal.set(error?.userMessage || 'Failed to create post');
        this.loadingSignal.set(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Update an existing post
   */
  updatePost(postId: string, request: UpdatePostRequest): Observable<SocialPost> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.put<PostResponse>(`${this.baseUrl}/api/content/posts/${postId}`, request).pipe(
      map((post) => this.mapPostResponse(post)),
      tap((post) => {
        this.postsSignal.update((posts) =>
          posts.map((p) => (p.id === postId ? post : p))
        );
        this.loadingSignal.set(false);
      }),
      catchError((error) => {
        this.errorSignal.set(error?.userMessage || 'Failed to update post');
        this.loadingSignal.set(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Delete a post
   */
  deletePost(postId: string): Observable<void> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.delete<void>(`${this.baseUrl}/api/content/posts/${postId}`).pipe(
      tap(() => {
        this.postsSignal.update((posts) => posts.filter((p) => p.id !== postId));
        this.loadingSignal.set(false);
      }),
      catchError((error) => {
        this.errorSignal.set(error?.userMessage || 'Failed to delete post');
        this.loadingSignal.set(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Schedule a post
   */
  schedulePost(postId: string, request: SchedulePostRequest): Observable<void> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.post<void>(`${this.baseUrl}/api/content/posts/${postId}/schedule`, request).pipe(
      tap(() => {
        // Refresh posts after scheduling
        this.refreshPosts().subscribe();
        this.loadingSignal.set(false);
      }),
      catchError((error) => {
        this.errorSignal.set(error?.userMessage || 'Failed to schedule post');
        this.loadingSignal.set(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Publish a post immediately
   */
  publishPost(postId: string): Observable<void> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.post<void>(`${this.baseUrl}/api/content/posts/${postId}/publish`, {}).pipe(
      tap(() => {
        // Refresh posts after publishing
        this.refreshPosts().subscribe();
        this.loadingSignal.set(false);
      }),
      catchError((error) => {
        this.errorSignal.set(error?.userMessage || 'Failed to publish post');
        this.loadingSignal.set(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Cancel a scheduled post
   */
  cancelScheduledPost(postId: string): Observable<void> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.post<void>(`${this.baseUrl}/api/content/posts/${postId}/cancel-schedule`, {}).pipe(
      tap(() => {
        // Refresh posts after canceling
        this.refreshPosts().subscribe();
        this.loadingSignal.set(false);
      }),
      catchError((error) => {
        this.errorSignal.set(error?.userMessage || 'Failed to cancel scheduled post');
        this.loadingSignal.set(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get list of posts (readonly signal)
   */
  listPosts() {
    return this.postsSignal.asReadonly();
  }

  /**
   * Draft management (local state for now)
   */
  getDrafts() {
    return this.draftsSignal.asReadonly();
  }

  getActiveDraft(): PostDraft | undefined {
    const drafts = this.draftsSignal();
    if (drafts.length) {
      return drafts[0];
    }
    return undefined;
  }

  createDraft(draft: Omit<PostDraft, 'id' | 'createdAt' | 'updatedAt'>): void {
    const newDraft: PostDraft = {
      ...draft,
      id: this.generateId('draft'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.draftsSignal.update((drafts) => [newDraft, ...drafts]);
  }

  updateDraft(id: string, changes: Partial<PostDraft>): void {
    this.draftsSignal.update((drafts) =>
      drafts.map((draft) => (draft.id === id ? { ...draft, ...changes, updatedAt: new Date().toISOString() } : draft))
    );
  }

  deleteDraft(id: string): void {
    this.draftsSignal.update((drafts) => drafts.filter((draft) => draft.id !== id));
  }

  /**
   * Map backend PostResponse to frontend SocialPost
   */
  private mapPostResponse(post: PostResponse): SocialPost {
    // Extract title from content (first line or first 50 chars)
    const contentLines = post.content.split('\n');
    const title = contentLines[0]?.substring(0, 50) || 'Untitled Post';
    
    // Get platforms from postTargets
    const platforms = post.postTargets.map((target) => target.platform.toLowerCase());
    
    // Get media URL if available
    const mediaUrl = post.media?.url;
    const mediaType = post.media?.fileType?.startsWith('image/') ? 'image' : 
                     post.media?.fileType?.startsWith('video/') ? 'video' : undefined;

    return {
      id: post.id,
      clientId: post.clientId,
      content: post.content,
      status: post.status,
      scheduledAt: post.scheduledAt,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      title: title.length > 50 ? title + '...' : title,
      mediaUrl,
      mediaType,
      platforms,
      reactions: 0, // Will be populated from analytics later
      views: 0, // Will be populated from analytics later
    };
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Math.random().toString(36).slice(2, 9)}_${Date.now()}`;
  }
}
