import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { PostDraft, SocialPost } from '../models/social.models';
import { API_BASE_URL } from '../config/api.config';

@Injectable({
  providedIn: 'root'
})
export class PostsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  private readonly postsSignal = signal<SocialPost[]>([]);
  readonly posts = this.postsSignal.asReadonly();

  private readonly draftsSignal = signal<PostDraft[]>([]);
  readonly drafts = this.draftsSignal.asReadonly();

  constructor() {
    this.refreshPosts().subscribe();
    this.seedDraft();
  }

  private seedDraft(): void {
    if (!this.draftsSignal().length) {
      this.draftsSignal.set([
        {
          id: this.generateId('draft'),
          caption: 'Launching our new campaign today! 🚀 Stay tuned for updates across all channels.',
          mediaUrl:
            'https://images.unsplash.com/photo-1618005198919-d3d4b5a92eee?auto=format&fit=crop&w=1200&q=80',
          mediaType: 'image',
          selectedPlatforms: ['facebook', 'instagram', 'twitter'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);
    }
  }

  getActiveDraft(): PostDraft | undefined {
    const drafts = this.draftsSignal();
    if (drafts.length) {
      return drafts[0];
    }

    const firstPost = this.postsSignal()[0];
    if (!firstPost) {
      return undefined;
    }

    return {
      id: `post_${firstPost.id}`,
      caption: firstPost.body,
      mediaUrl:
        'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80',
      mediaType: 'image',
      selectedPlatforms: ['facebook', 'instagram', 'linkedin'],
      createdAt: firstPost.scheduledAt ?? new Date().toISOString(),
      updatedAt: firstPost.scheduledAt ?? new Date().toISOString(),
    };
  }

  refreshPosts(limit = 20): Observable<SocialPost[]> {
    return this.http
      .get<{ posts: any[] }>(`${this.baseUrl}/posts`, { params: { limit } as any })
      .pipe(
        map((response) => response.posts.map((post) => this.mapPost(post))),
        tap((posts) => this.postsSignal.set(posts))
      );
  }

  listPosts() {
    return this.postsSignal.asReadonly();
  }

  getPost(id: number): Observable<SocialPost> {
    return this.http.get<any>(`${this.baseUrl}/posts/${id}`).pipe(map((post) => this.mapPost(post)));
  }

  createPost(payload: Partial<SocialPost>): Observable<SocialPost> {
    const body = {
      title: payload.title || 'Untitled',
      body: payload.body || '',
      tags: payload.tags || [],
    };
    return this.http
      .post<any>(`${this.baseUrl}/posts/add`, body)
      .pipe(map((post) => this.mapPost(post)), tap(() => this.refreshPosts().subscribe()));
  }

  updatePost(id: number, payload: Partial<SocialPost>): Observable<SocialPost> {
    return this.http
      .put<any>(`${this.baseUrl}/posts/${id}`, payload)
      .pipe(map((post) => this.mapPost(post)), tap(() => this.refreshPosts().subscribe()));
  }

  deletePost(id: number): Observable<{ isDeleted: boolean }> {
    return this.http
      .delete<{ isDeleted: boolean }>(`${this.baseUrl}/posts/${id}`)
      .pipe(tap(() => this.refreshPosts().subscribe()));
  }

  getDrafts() {
    return this.draftsSignal.asReadonly();
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

  private mapPost(post: any): SocialPost {
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - (post.id % 30));
    const statusCycle: SocialPost['status'][] = ['draft', 'scheduled', 'published', 'pending'];
    return {
      id: post.id,
      title: post.title,
      body: post.body,
      tags: post.tags ?? [],
      reactions: post.reactions ?? 0,
      views: post.views ?? Math.round((post.reactions ?? 1) * 10),
      status: statusCycle[post.id % statusCycle.length],
      scheduledAt: createdAt.toISOString(),
    };
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Math.random().toString(36).slice(2, 9)}_${Date.now()}`;
  }
}
