import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { TasksService } from '../../services/team/tasks.service';
import { Task } from '../../models/task.models';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-team-tasks-page',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './tasks-page.html',
  styleUrl: './tasks-page.css',
})
export class TeamTasksPage implements OnInit, OnDestroy {
  private readonly tasksService = inject(TasksService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly tasks = this.tasksService.tasks;
  readonly loading = this.tasksService.loading;
  readonly error = this.tasksService.error;

  readonly isEditor = signal(false);
  readonly isAdmin = signal(false);

  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  private loadSubscription: Subscription | null = null;

  ngOnInit(): void {
    const user = this.authService.user();
    if (user) {
      this.isEditor.set(user.role === 'Editor');
      this.isAdmin.set(user.role === 'Admin');
    }

    this.loadSubscription = this.tasksService.loadAssignedTasks().subscribe({
      error: (error) => {
        console.error('Failed to load tasks', error);
        this.errorMessage.set('Failed to load tasks. Please try again.');
        setTimeout(() => this.errorMessage.set(null), 5000);
      },
    });
  }

  ngOnDestroy(): void {
    this.loadSubscription?.unsubscribe();
  }

  startTask(task: Task): void {
    if (task.status !== 'Pending') {
      return;
    }

    this.tasksService.startTask(task.id).subscribe({
      next: () => {
        this.successMessage.set('Task started successfully');
        setTimeout(() => this.successMessage.set(null), 3000);
      },
      error: (error) => {
        console.error('Failed to start task', error);
        this.errorMessage.set(error?.message || 'Failed to start task. Please try again.');
        setTimeout(() => this.errorMessage.set(null), 5000);
      },
    });
  }

  completeTask(task: Task): void {
    if (task.status === 'Completed') {
      return;
    }

    if (!confirm(`Mark "${task.title}" as completed?`)) {
      return;
    }

    this.tasksService.completeTask(task.id).subscribe({
      next: () => {
        this.successMessage.set('Task completed successfully. Waiting for approval.');
        setTimeout(() => this.successMessage.set(null), 3000);
      },
      error: (error) => {
        console.error('Failed to complete task', error);
        this.errorMessage.set(error?.message || 'Failed to complete task. Please try again.');
        setTimeout(() => this.errorMessage.set(null), 5000);
      },
    });
  }

  getStatusBadgeClass(status: string): string {
    const statusClasses: Record<string, string> = {
      Pending: 'bg-yellow-50 text-yellow-600',
      InProgress: 'bg-blue-50 text-blue-600',
      Completed: 'bg-green-50 text-green-600',
      Cancelled: 'bg-gray-50 text-gray-600',
    };
    return statusClasses[status] || 'bg-gray-50 text-gray-600';
  }

  getPriorityBadgeClass(priority: string): string {
    const priorityClasses: Record<string, string> = {
      Low: 'bg-green-50 text-green-600',
      Normal: 'bg-blue-50 text-blue-600',
      High: 'bg-red-50 text-red-600',
    };
    return priorityClasses[priority] || 'bg-gray-50 text-gray-600';
  }

  trackTaskById(_: number, task: Task): string {
    return task.id;
  }

  canStartTask(task: Task): boolean {
    return this.isEditor() && task.status === 'Pending';
  }

  canCompleteTask(task: Task): boolean {
    return this.isEditor() && (task.status === 'Pending' || task.status === 'InProgress');
  }

  /**
   * Whether the current task allows opening a client dashboard
   */
  canOpenClientDashboard(task: Task): boolean {
    return !!task.clientId && task.status !== 'Completed' && task.status !== 'Cancelled';
  }

  /**
   * Open the client dashboard for the task's client inside the team layout.
   * Access is validated server-side and only allowed while the task is active.
   */
  openClientDashboard(task: Task): void {
    if (!this.canOpenClientDashboard(task)) {
      return;
    }

    this.successMessage.set(null);
    this.errorMessage.set(null);

    this.tasksService.getTaskClientAccess(task.id).subscribe({
      next: (clientId: string) => {
        // Navigate to client dashboard within the team context
        this.router.navigate(['/team/client', clientId, 'dashboard']);
      },
      error: (error) => {
        console.error('Failed to get client access for task:', error);
        this.errorMessage.set(error?.message || 'Failed to get client access for task.');
        setTimeout(() => this.errorMessage.set(null), 5000);
      },
    });
  }
}

