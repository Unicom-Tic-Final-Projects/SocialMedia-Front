import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap, catchError, throwError, switchMap, of } from 'rxjs';
import { API_BASE_URL } from '../../config/api.config';
import { AuthService } from '../../core/services/auth.service';
import { LoggingService } from '../../core/services/logging.service';
import {
  PostResponse,
  CreatePostRequest,
  UpdatePostRequest,
  SchedulePostRequest,
  SocialPost,
  PostStatus,
} from '../../models/post.models';
import { ClientsService } from './clients.service';
import { Client } from '../../models/client.models';
import { PostMappingService } from './post-mapping.service';

@Injectable({
  providedIn: 'root',
})
export class PostsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly authService = inject(AuthService);
  private readonly clientsService = inject(ClientsService);
  private readonly mappingService = inject(PostMappingService);
  private readonly loggingService = inject(LoggingService);

  private readonly postsSignal = signal<SocialPost[]>([]);
  readonly posts = this.postsSignal.asReadonly();

  private readonly loadingSignal = signal(false);
  readonly loading = this.loadingSignal.asReadonly();

  private readonly errorSignal = signal<string | null>(null);
  readonly error = this.errorSignal.asReadonly();

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
        return Array.isArray(posts)
          ? this.mappingService.mapPostResponseArray(posts as PostResponse[])
          : [];
      }),
      tap((_posts) => {
        this.loadingSignal.set(false);
      }),
      catchError((error) => {
        this.errorSignal.set(error?.userMessage || 'Failed to load posts');
        this.loadingSignal.set(false);
        return of([] as SocialPost[]);
      }),
    );
  }

  /**
   * Get posts by client ID (for agencies)
   */
  getPostsByClientId(clientId: string): Observable<SocialPost[]> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.get<PostResponse[]>(`${this.baseUrl}/api/posts/client/${clientId}`).pipe(
      map((posts) => this.mappingService.mapPostResponseArray(posts)),
      tap((posts) => {
        this.postsSignal.set(posts);
        this.loadingSignal.set(false);
      }),
      catchError((error) => {
        this.errorSignal.set(error?.userMessage || 'Failed to load posts');
        this.loadingSignal.set(false);
        return throwError(() => error);
      }),
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

        // For individual users, ensure we have a client
        // If no client exists, try to load clients first
        if (!isAgency) {
          return this.clientsService.loadClients().pipe(
            switchMap(() => {
              const userClient = this.clientsService.getSelectedClient();
              if (userClient) {
                return this.getPostsByClientId(userClient.id);
              }
              // If still no client, return empty array (individual users should have a client)
              this.loggingService.warn('Individual user has no client assigned', null, 'PostsService');
              this.postsSignal.set([]);
              return of([] as SocialPost[]);
            }),
          );
        }

        // Fallback for agencies without an explicit client (should not happen)
        return this.getPostsByStatus('Draft');
      }),
      tap(() => this.loadingSignal.set(false)),
      catchError((error) => {
        this.loadingSignal.set(false);
        if (!this.errorSignal()) {
          this.errorSignal.set(error?.userMessage || 'Failed to load posts');
        }
        return throwError(() => error);
      }),
    );
  }

  /**
   * Get all posts by fetching multiple statuses and combining
   */
  getAllPosts(): Observable<SocialPost[]> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    const _statuses: PostStatus[] = [
      'Draft',
      'Scheduled',
      'Published',
      'PendingApproval',
      'Approved',
    ];

    // Fetch all statuses and combine
    // For MVP, we'll just get Draft posts
    // TODO: Implement proper fetching of all statuses and combining
    return this.getPostsByStatus('Draft');
  }

  /**
   * Get a single post by ID
   */
  getPost(id: string): Observable<SocialPost> {
    return this.http
      .get<PostResponse>(`${this.baseUrl}/api/posts/${id}`)
      .pipe(map((post) => this.mappingService.mapPostResponse(post)));
  }

  /**
   * Get raw PostResponse (unmapped) for editing - includes full media information
   */
  getPostRaw(id: string): Observable<PostResponse> {
    return this.http.get<any>(`${this.baseUrl}/api/posts/${id}`).pipe(
      map((response) => {
        // Handle ApiResponse structure
        if (response?.data) {
          return response.data as PostResponse;
        }
        return response as PostResponse;
      }),
      catchError((error) => {
        this.loggingService.error('Failed to load post', error, 'PostsService');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Create a new post
   */
  createPost(request: CreatePostRequest): Observable<SocialPost> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    // Validate request before sending
    if (!request) {
      const error = new Error('CreatePostRequest is null or undefined');
      this.loggingService.error('Invalid request', error, 'PostsService');
      this.loadingSignal.set(false);
      return throwError(() => error);
    }

    if (!request.clientId || !request.createdByTeamMemberId || !request.content) {
      const error = new Error(`Missing required fields: clientId=${!!request.clientId}, createdByTeamMemberId=${!!request.createdByTeamMemberId}, content=${!!request.content}`);
      this.loggingService.error('Invalid request fields', { request, error }, 'PostsService');
      this.loadingSignal.set(false);
      return throwError(() => error);
    }

    // Build clean request object with all required fields
    // Ensure all values are properly defined (no undefined values)
    const cleanRequest: CreatePostRequest = {
      clientId: request.clientId,
      createdByTeamMemberId: request.createdByTeamMemberId,
      content: request.content.trim(),
      mediaId: request.mediaId || undefined,
      socialAccountIds: Array.isArray(request.socialAccountIds) ? request.socialAccountIds : [],
      scheduledAt: request.scheduledAt || undefined,
    };

    // Validate clean request has required fields
    if (!cleanRequest.clientId || !cleanRequest.createdByTeamMemberId || !cleanRequest.content) {
      const error = new Error(`Missing required fields in clean request: clientId=${!!cleanRequest.clientId}, createdByTeamMemberId=${!!cleanRequest.createdByTeamMemberId}, content=${!!cleanRequest.content}`);
      this.loggingService.error('Invalid clean request', { cleanRequest, originalRequest: request, error }, 'PostsService');
      this.loadingSignal.set(false);
      return throwError(() => error);
    }

    // Remove undefined values and empty GUIDs to ensure clean JSON
    const finalRequest: any = {
      clientId: cleanRequest.clientId,
      createdByTeamMemberId: cleanRequest.createdByTeamMemberId,
      content: cleanRequest.content,
    };
    
    // Only include mediaId if it's a valid GUID (not empty/null/undefined)
    if (cleanRequest.mediaId && 
        cleanRequest.mediaId !== '00000000-0000-0000-0000-000000000000' &&
        cleanRequest.mediaId.trim() !== '') {
      finalRequest.mediaId = cleanRequest.mediaId;
    }
    if (cleanRequest.socialAccountIds && cleanRequest.socialAccountIds.length > 0) {
      finalRequest.socialAccountIds = cleanRequest.socialAccountIds;
    }
    if (cleanRequest.scheduledAt) {
      finalRequest.scheduledAt = cleanRequest.scheduledAt;
    }

    // Log the final request for debugging
    const requestJson = JSON.stringify(finalRequest);
    console.log('[PostsService] Creating post - Final request:', finalRequest);
    console.log('[PostsService] Creating post - Final request JSON:', requestJson);
    console.log('[PostsService] Creating post - Request URL:', `${this.baseUrl}/api/posts`);
    console.log('[PostsService] Creating post - Request keys:', Object.keys(finalRequest));
    console.log('[PostsService] Creating post - Request has clientId:', !!finalRequest.clientId);
    console.log('[PostsService] Creating post - Request has createdByTeamMemberId:', !!finalRequest.createdByTeamMemberId);
    console.log('[PostsService] Creating post - Request has content:', !!finalRequest.content);
    console.log('[PostsService] Creating post - Request content length:', finalRequest.content?.length || 0);

    this.loggingService.debug('Creating post', { 
      finalRequest, 
      finalRequestJson: requestJson,
      originalRequest: request 
    }, 'PostsService');

    // Angular HttpClient automatically serializes objects to JSON
    // Ensure we're sending a valid object (not null/undefined)
    if (!finalRequest || typeof finalRequest !== 'object') {
      const error = new Error('Final request is not a valid object');
      this.loggingService.error('Invalid final request', { finalRequest, error }, 'PostsService');
      this.loadingSignal.set(false);
      return throwError(() => error);
    }

    return this.http.post<PostResponse>(`${this.baseUrl}/api/posts`, finalRequest).pipe(
      tap((response) => {
        this.loggingService.debug('CreatePost raw response', { response, type: typeof response, keys: Object.keys(response || {}) }, 'PostsService');
      }),
      map((post) => {
        this.loggingService.debug('Mapping post response', post, 'PostsService');
        if (!post) {
          throw new Error('Post response is null or undefined');
        }
        if (!post.id) {
          throw new Error('Post response missing id field');
        }
        return this.mappingService.mapPostResponse(post);
      }),
      tap((post) => {
        this.loggingService.debug('Mapped post', post, 'PostsService');
        this.postsSignal.update((posts) => [post, ...posts]);
        this.loadingSignal.set(false);
      }),
      catchError((error) => {
        this.loggingService.error('Error creating post', error, 'PostsService');
        this.errorSignal.set(error?.userMessage || 'Failed to create post');
        this.loadingSignal.set(false);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Update an existing post
   */
  updatePost(postId: string, request: UpdatePostRequest): Observable<SocialPost> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    // Validate request before sending
    if (!request) {
      const error = new Error('UpdatePostRequest is null or undefined');
      this.loggingService.error('Invalid request', error, 'PostsService');
      this.loadingSignal.set(false);
      return throwError(() => error);
    }

    if (!request.content || request.content.trim() === '') {
      const error = new Error('Content is required');
      this.loggingService.error('Invalid request - missing content', { request, error }, 'PostsService');
      this.loadingSignal.set(false);
      return throwError(() => error);
    }

    // Build clean request object, explicitly including only defined properties
    const finalRequest: UpdatePostRequest = {
      content: request.content.trim(),
      socialAccountIds: Array.isArray(request.socialAccountIds) ? request.socialAccountIds : [],
    };

    // Conditionally add optional fields if they are defined
    if (request.mediaId && request.mediaId !== '00000000-0000-0000-0000-000000000000') {
      finalRequest.mediaId = request.mediaId;
    }
    if (request.scheduledAt) {
      finalRequest.scheduledAt = request.scheduledAt;
    }

    // Log the final request for debugging
    const requestJson = JSON.stringify(finalRequest);
    console.log('[PostsService] Updating post - Final request:', finalRequest);
    console.log('[PostsService] Updating post - Final request JSON:', requestJson);
    console.log('[PostsService] Updating post - Request URL:', `${this.baseUrl}/api/posts/${postId}`);

    this.loggingService.debug('Updating post', { 
      postId,
      finalRequest, 
      finalRequestJson: requestJson,
      originalRequest: request 
    }, 'PostsService');

    // Ensure we're sending a valid object (not null/undefined)
    if (!finalRequest || typeof finalRequest !== 'object') {
      const error = new Error('Final request is not a valid object');
      this.loggingService.error('Invalid final request', { finalRequest, error }, 'PostsService');
      this.loadingSignal.set(false);
      return throwError(() => error);
    }

    return this.http.put<PostResponse>(`${this.baseUrl}/api/posts/${postId}`, finalRequest).pipe(
      map((post) => this.mappingService.mapPostResponse(post)),
      tap((post) => {
        this.postsSignal.update((posts) => posts.map((p) => (p.id === postId ? post : p)));
        this.loadingSignal.set(false);
      }),
      catchError((error) => {
        this.errorSignal.set(error?.userMessage || 'Failed to update post');
        this.loadingSignal.set(false);
        return throwError(() => error);
      }),
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
      }),
    );
  }

  /**
   * Schedule a post
   */
  schedulePost(postId: string, request: SchedulePostRequest): Observable<void> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    // Validate inputs
    if (!postId || postId.trim() === '') {
      const error = new Error('Post ID is required');
      this.errorSignal.set('Post ID is required');
      this.loadingSignal.set(false);
      return throwError(() => error);
    }

    if (!request || !request.scheduledAt) {
      const error = new Error('Scheduled date is required');
      this.errorSignal.set('Scheduled date is required');
      this.loadingSignal.set(false);
      return throwError(() => error);
    }

    // Ensure request is properly formatted with required fields
    const requestBody: any = {
      scheduledAt: request.scheduledAt,
      socialAccountIds: Array.isArray(request.socialAccountIds) ? request.socialAccountIds : [],
    };

    // Validate request body is not empty
    if (!requestBody.scheduledAt) {
      const error = new Error('Scheduled date cannot be empty');
      this.errorSignal.set('Scheduled date cannot be empty');
      this.loadingSignal.set(false);
      return throwError(() => error);
    }

    console.log('Sending schedule request:', JSON.stringify(requestBody));
    console.log('Request URL:', `${this.baseUrl}/api/posts/${postId}/schedule`);
    console.log('Request body type:', typeof requestBody);
    console.log('Request body keys:', Object.keys(requestBody));
    console.log('Request body scheduledAt:', requestBody.scheduledAt);
    console.log('Request body socialAccountIds:', requestBody.socialAccountIds);

    // Angular HttpClient automatically serializes JavaScript objects to JSON
    // and sets Content-Type: application/json header
    // No need to manually stringify or set headers
    return this.http.post<void>(
      `${this.baseUrl}/api/posts/${postId}/schedule`,
      requestBody
    ).pipe(
      tap(() => {
        // Refresh posts after scheduling
        this.refreshPosts().subscribe();
        this.loadingSignal.set(false);
      }),
      catchError((error) => {
        this.errorSignal.set(error?.userMessage || 'Failed to schedule post');
        this.loadingSignal.set(false);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Publish a post immediately
   * Returns an object with success status and message for partial success handling
   */
  publishPost(postId: string): Observable<{ success: boolean; message: string }> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    this.loggingService.debug(`Publishing post: ${postId}`, { postId, url: `${this.baseUrl}/api/posts/${postId}/publish` }, 'PostsService');

    // Publish endpoint doesn't require a request body - send null instead of empty object
    return this.http.post<any>(`${this.baseUrl}/api/posts/${postId}/publish`, null).pipe(
      tap((response) => {
        this.loggingService.debug('Publish response', response, 'PostsService');
        // Refresh posts after publishing
        this.refreshPosts().subscribe();
        this.loadingSignal.set(false);
      }),
      map((response) => {
        // Return response with message for partial success handling
        return {
          success: response?.success !== false && response?.data === true,
          message: response?.message || 'Post published successfully',
        };
      }),
      catchError((error) => {
        this.loggingService.error('Publish error', error, 'PostsService');
        const errorMessage =
          error?.error?.message || error?.userMessage || error?.message || 'Failed to publish post';
        this.loggingService.error('Publish error details', {
          error,
          errorMessage,
          status: error?.status,
          url: error?.url,
          errorBody: error?.error,
        });
        this.errorSignal.set(errorMessage);
        this.loadingSignal.set(false);
        return throwError(() => ({ ...error, userMessage: errorMessage }));
      }),
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
      }),
    );
  }

  /**
   * Get list of posts (readonly signal)
   */
  listPosts() {
    return this.postsSignal.asReadonly();
  }

  private ensureActiveClient(): Observable<Client | null> {
    const existingClient = this.clientsService.getSelectedClient();
    if (existingClient) {
      return of(existingClient);
    }

    return this.clientsService
      .loadClients()
      .pipe(map(() => this.clientsService.getSelectedClient() ?? null));
  }
}
