import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { ApprovalRequest } from '../models/social.models';
import { API_BASE_URL } from '../config/api.config';

@Injectable({ providedIn: 'root' })
export class ApprovalsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  private readonly approvalsSignal = signal<ApprovalRequest[]>([]);
  readonly approvals = this.approvalsSignal.asReadonly();

  constructor() {
    this.refresh().subscribe();
  }

  refresh(limit = 12): Observable<ApprovalRequest[]> {
    return this.http
      .get<{ posts: any[] }>(`${this.baseUrl}/posts`, { params: { limit } as any })
      .pipe(
        map(({ posts }) =>
          posts.map((post) => this.mapApproval(post))
        ),
        tap((items) => this.approvalsSignal.set(items))
      );
  }

  updateStatus(id: number, status: ApprovalRequest['status']): void {
    this.approvalsSignal.update((items) =>
      items.map((item) => (item.id === id ? { ...item, status } : item))
    );
  }

  private mapApproval(post: any): ApprovalRequest {
    const submittedAt = new Date();
    submittedAt.setHours(submittedAt.getHours() - (post.id % 48));
    const statuses: ApprovalRequest['status'][] = ['pending', 'approved', 'rejected'];
    return {
      id: post.id,
      postId: post.id,
      reviewer: post.userId ? `Reviewer #${post.userId}` : 'Automated Workflow',
      status: statuses[post.id % statuses.length],
      submittedAt: submittedAt.toISOString(),
      notes: post.body,
    };
  }
}
