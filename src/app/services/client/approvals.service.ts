import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap, catchError, of } from 'rxjs';
import { ApprovalRequest } from '../../models/social.models';
import { API_BASE_URL } from '../../config/api.config';

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
      .get<any>(`${this.baseUrl}/api/approvals/pending`)
      .pipe(
        map((response) => {
          // Handle ApiResponse structure
          const approvals = response?.data || response || [];
          return Array.isArray(approvals)
            ? approvals.map((approval: any) => this.mapApproval(approval))
            : [];
        }),
        tap((items) => this.approvalsSignal.set(items)),
        catchError((error) => {
          console.error('Error fetching approvals:', error);
          this.approvalsSignal.set([]);
          return [];
        })
      );
  }

  updateStatus(id: number, status: ApprovalRequest['status']): Observable<void> {
    return this.http
      .post<any>(`${this.baseUrl}/api/approvals/review`, {
        approvalId: id,
        status: status,
        comments: status === 'rejected' ? 'Rejected' : status === 'approved' ? 'Approved' : '',
      })
      .pipe(
        tap(() => {
          this.approvalsSignal.update((items) =>
            items.map((item) => (item.id === id ? { ...item, status } : item))
          );
        })
      );
  }

  private mapApproval(approval: any): ApprovalRequest {
    return {
      id: approval.id || approval.approvalId || 0,
      postId: approval.postId || 0,
      reviewer: approval.reviewerId || approval.reviewedBy || 'Unknown Reviewer',
      status: (approval.status?.toLowerCase() || 'pending') as ApprovalRequest['status'],
      submittedAt: approval.createdAt || approval.requestedAt || new Date().toISOString(),
      notes: approval.comments || approval.notes || '',
    };
  }
}
