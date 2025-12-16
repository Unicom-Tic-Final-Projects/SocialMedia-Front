import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { AgencyTasksService } from '../../services/agency/tasks.service';
import { AuthService } from '../../core/services/auth.service';
import { ClientContextService } from '../../services/client/client-context.service';
import { ToastService } from '../../core/services/toast.service';
import {
  TaskApprovalRequest,
  ReviewTaskApprovalRequest,
} from '../../models/task.models';
import { Subscription, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-agency-task-approvals-page',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './task-approvals-page.html',
  styleUrl: './task-approvals-page.css',
})
export class AgencyTaskApprovalsPage implements OnInit, OnDestroy {
  private readonly tasksService = inject(AgencyTasksService);
  private readonly authService = inject(AuthService);
  private readonly clientContextService = inject(ClientContextService);
  private readonly toastService = inject(ToastService);

  readonly pendingApprovals = this.tasksService.pendingApprovals;
  readonly loading = this.tasksService.loading;
  readonly error = this.tasksService.error;

  searchQuery = signal<string>('');

  // Check if current user is Owner or Admin
  readonly canApprove = computed(() => {
    const user = this.authService.user();
    if (!user || !user.role) return false;
    const role = user.role.toLowerCase();
    return role === 'owner' || role === 'admin';
  });

  // Filter approvals based on search query
  readonly filteredApprovals = computed(() => {
    const approvals = this.pendingApprovals();
    const query = this.searchQuery().toLowerCase();
    if (!query) return approvals;
    return approvals.filter(
      (approval) =>
        approval.taskTitle?.toLowerCase().includes(query) ||
        approval.requestedByEmail?.toLowerCase().includes(query) ||
        approval.assignedToEmail?.toLowerCase().includes(query) ||
        approval.clientName?.toLowerCase().includes(query),
    );
  });

  private refreshInterval: any;
  private loadSubscription: Subscription | null = null;

  ngOnInit(): void {
    if (!this.canApprove()) {
      this.toastService.error('You do not have permission to view approvals');
      return;
    }

    // Load pending approvals
    this.loadApprovals();

    // Auto-refresh every 10 seconds
    this.refreshInterval = setInterval(() => {
      this.loadApprovals();
    }, 10000);
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    this.loadSubscription?.unsubscribe();
  }

  loadApprovals(): void {
    const clientId = this.clientContextService.getCurrentClientId();
    this.loadSubscription = this.tasksService
      .loadPendingApprovals(clientId || undefined)
      .subscribe({
        error: (error) => {
          console.error('Failed to load pending approvals', error);
        },
      });
  }

  approveTask(approval: TaskApprovalRequest): void {
    if (!confirm(`Are you sure you want to approve the completion of task "${approval.taskTitle}"?`)) {
      return;
    }

    const user = this.authService.user();
    if (!user || !user.userId) {
      this.toastService.error('User not authenticated');
      return;
    }

    const request: ReviewTaskApprovalRequest = {
      requestId: approval.id,
      reviewerId: user.userId,
      status: 'Approved',
      comment: 'Task completion approved by admin/owner.',
    };

    this.tasksService.reviewTaskApproval(approval.id, request).subscribe({
      next: () => {
        this.toastService.success('Task completion approved successfully! Task marked as Completed.');
        this.loadApprovals(); // Reload approvals
      },
      error: (error) => {
        console.error('Failed to approve task completion', error);
        this.toastService.error(error?.message || 'Failed to approve task completion. Please try again.');
      },
    });
  }

  rejectTask(approval: TaskApprovalRequest): void {
    const comment = prompt(
      `Are you sure you want to reject the completion of task "${approval.taskTitle}"? Please provide a reason:`,
    );
    if (comment === null) {
      // User cancelled prompt
      return;
    }

    const user = this.authService.user();
    if (!user || !user.userId) {
      this.toastService.error('User not authenticated');
      return;
    }

    const request: ReviewTaskApprovalRequest = {
      requestId: approval.id,
      reviewerId: user.userId,
      status: 'Rejected',
      comment: comment || 'Task completion rejected by admin/owner.',
    };

    this.tasksService.reviewTaskApproval(approval.id, request).subscribe({
      next: () => {
        this.toastService.success('Task completion rejected. Task remains in progress.');
        this.loadApprovals(); // Reload approvals
      },
      error: (error) => {
        console.error('Failed to reject task completion', error);
        this.toastService.error(error?.message || 'Failed to reject task completion. Please try again.');
      },
    });
  }

  trackApprovalById(_: number, approval: TaskApprovalRequest): string {
    return approval.id;
  }
}

