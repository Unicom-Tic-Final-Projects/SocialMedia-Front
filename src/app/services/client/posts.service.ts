import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, tap, catchError, throwError, switchMap, of } from 'rxjs';
import { API_BASE_URL } from '../../config/api.config';
import { AuthService } from '../../core/services/auth.service';
import { 
  PostResponse, 
  CreatePostRequest, 
  UpdatePostRequest, 
  SchedulePostRequest,
  SocialPost,
  PostStatus 
} from '../../models/post.models';
import { PostDraft } from '../../models/social.models';
import { ClientsService } from './clients.service';
import { Client } from '../../models/client.models';

@Injectable({
  providedIn: 'root'
})
export class PostsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly authService = inject(AuthService);
  private readonly clientsService = inject(ClientsService);

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

    return this.http.get<any>(`${this.baseUrl}/api/posts/status/${status}`).pipe(
      map((response) => {
        // Handle ApiResponse structure
        const posts = response?.data || response || [];
        return Array.isArray(posts) ? posts.map((post: PostResponse) => this.mapPostResponse(post)) : [];
      }),
      tap((posts) => {
        this.loadingSignal.set(false);
      }),
      catchError((error) => {
        this.errorSignal.set(error?.userMessage || 'Failed to load posts');
        this.loadingSignal.set(false);
        return of([] as SocialPost[]);
      })
    );
  }

  /**
   * Get posts by client ID (for agencies)
   */
  getPostsByClientId(clientId: string): Observable<SocialPost[]> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.get<PostResponse[]>(`${this.baseUrl}/api/posts/client/${clientId}`).pipe(
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

    const isAgency = this.authService.isAgency();

    return this.ensureActiveClient().pipe(
      switchMap((client) => {
        if (isAgency && !client) {
          const message = 'Please create or select a client to view posts';
          this.errorSignal.set(message);
          this.loadingSignal.set(false);
          return throwError(() => new Error(message));
        }

        if (client) {
          return this.getPostsByClientId(client.id);
        }

        // Fallback for individuals without an explicit client
        return this.getPostsByStatus('Draft');
      }),
      tap(() => this.loadingSignal.set(false)),
      catchError((error) => {
        this.loadingSignal.set(false);
        if (!this.errorSignal()) {
          this.errorSignal.set(error?.userMessage || 'Failed to load posts');
        }
        return throwError(() => error);
      })
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
    return this.http.get<PostResponse>(`${this.baseUrl}/api/posts/${id}`).pipe(
      map((post) => this.mapPostResponse(post))
    );
  }

  /**
   * Create a new post
   */
  createPost(request: CreatePostRequest): Observable<SocialPost> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.post<PostResponse>(`${this.baseUrl}/api/posts`, request).pipe(
      tap((response) => {
        console.log('CreatePost raw response:', response);
        console.log('Response type:', typeof response);
        console.log('Response keys:', Object.keys(response || {}));
      }),
      map((post) => {
        console.log('Mapping post response:', post);
        if (!post) {
          throw new Error('Post response is null or undefined');
        }
        if (!post.id) {
          throw new Error('Post response missing id field');
        }
        return this.mapPostResponse(post);
      }),
      tap((post) => {
        console.log('Mapped post:', post);
        this.postsSignal.update((posts) => [post, ...posts]);
        this.loadingSignal.set(false);
      }),
      catchError((error) => {
        console.error('Error creating post:', error);
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

    return this.http.put<PostResponse>(`${this.baseUrl}/api/posts/${postId}`, request).pipe(
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

    return this.http.delete<void>(`${this.baseUrl}/api/posts/${postId}`).pipe(
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

    return this.http.post<void>(`${this.baseUrl}/api/posts/${postId}/schedule`, request).pipe(
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
   * Returns an object with success status and message for partial success handling
   */
  publishPost(postId: string): Observable<{ success: boolean; message: string }> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    console.log('Publishing post:', postId, 'to:', `${this.baseUrl}/api/posts/${postId}/publish`);

    return this.http.post<any>(`${this.baseUrl}/api/posts/${postId}/publish`, {}).pipe(
      tap((response) => {
        console.log('Publish response:', response);
        // Refresh posts after publishing
        this.refreshPosts().subscribe();
        this.loadingSignal.set(false);
      }),
      map((response) => {
        // Return response with message for partial success handling
        return { 
          success: response?.success !== false && response?.data === true, 
          message: response?.message || 'Post published successfully' 
        };
      }),
      catchError((error) => {
        console.error('Publish error:', error);
        const errorMessage = error?.error?.message || error?.userMessage || error?.message || 'Failed to publish post';
        console.error('Publish error details:', {
          error,
          errorMessage,
          status: error?.status,
          url: error?.url,
          errorBody: error?.error
        });
        this.errorSignal.set(errorMessage);
        this.loadingSignal.set(false);
        return throwError(() => ({ ...error, userMessage: errorMessage }));
      })
    );
  }

  /**
   * Cancel a scheduled post
   */
  cancelScheduledPost(postId: string): Observable<void> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.post<void>(`${this.baseUrl}/api/posts/${postId}/cancel-schedule`, {}).pipe(
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
    // Handle case where content might be undefined or null
    const content = post.content || '';
    const contentLines = content.split('\n');
    const title = contentLines[0]?.substring(0, 50) || 'Untitled Post';
    
    // Get platforms from postTargets (handle undefined/null)
    const platforms = (post.postTargets || []).map((target) => target.platform.toLowerCase());
    
    // Get media URL if available
    const mediaUrl = post.media?.url;
    const mediaType = post.media?.fileType?.startsWith('image/') ? 'image' : 
                     post.media?.fileType?.startsWith('video/') ? 'video' : undefined;

    return {
      id: post.id,
      clientId: post.clientId,
      content: content, // Use the safe content variable
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

  private ensureActiveClient(): Observable<Client | null> {
    const existingClient = this.clientsService.getSelectedClient();
    if (existingClient) {
      return of(existingClient);
    }

    return this.clientsService.loadClients().pipe(
      map(() => this.clientsService.getSelectedClient() ?? null)
    );
  }
}
