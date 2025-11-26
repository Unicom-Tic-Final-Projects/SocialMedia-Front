import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_BASE_URL } from '../../config/api.config';
import { ApiResponse } from '../../models/auth.models';

export interface AdminPostResponse {
  id: string;
  clientId: string;
  createdByUserId: string;
  mediaId?: string;
  content: string;
  status: string;
  scheduledAt?: string;
  createdAt: string;
  updatedAt?: string;
  clientName?: string;
  title?: string; // For compatibility with existing code
}

@Injectable({ providedIn: 'root' })
export class PostsService {
  private http = inject(HttpClient);
  private baseUrl = inject(API_BASE_URL);

  getPosts(): Observable<AdminPostResponse[]> {
    return this.http.get<ApiResponse<AdminPostResponse[]>>(`${this.baseUrl}/api/admin/posts`).pipe(
      map(response => {
        if (response.success && response.data) {
          // Map backend data to match frontend expectations
          return response.data.map(post => ({
            ...post,
            title: post.content?.substring(0, 50) || 'Untitled Post'
          }));
        }
        return [];
      })
    );
  }

  getPostById(id: string): Observable<AdminPostResponse | null> {
    return this.http.get<ApiResponse<AdminPostResponse>>(`${this.baseUrl}/api/admin/posts/${id}`).pipe(
      map(response => {
        if (response.success && response.data) {
          return {
            ...response.data,
            title: response.data.content?.substring(0, 50) || 'Untitled Post'
          };
        }
        return null;
      })
    );
  }

  createPost(post: CreatePostRequest): Observable<ApiResponse<AdminPostResponse>> {
    return this.http.post<ApiResponse<AdminPostResponse>>(`${this.baseUrl}/api/admin/posts`, post);
  }

  updatePost(id: string, post: UpdatePostRequest): Observable<ApiResponse<AdminPostResponse>> {
    return this.http.put<ApiResponse<AdminPostResponse>>(`${this.baseUrl}/api/admin/posts/${id}`, post);
  }

  deletePost(id: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/api/admin/posts/${id}`);
  }
}

export interface CreatePostRequest {
  clientId: string;
  createdByUserId: string;
  mediaId?: string;
  content: string;
  status?: string;
  scheduledAt?: string;
  socialAccountIds?: string[];
}

export interface UpdatePostRequest {
  clientId?: string;
  mediaId?: string;
  content?: string;
  status?: string;
  scheduledAt?: string;
  isDeleted?: boolean;
}

