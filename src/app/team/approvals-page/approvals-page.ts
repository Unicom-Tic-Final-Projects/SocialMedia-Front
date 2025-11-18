import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { TasksService } from '../../services/team/tasks.service';
import { Task } from '../../models/task.models';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-team-approvals-page',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './approvals-page.html',
  styleUrl: './approvals-page.css',
})
export class TeamApprovalsPage implements OnInit, OnDestroy {
  private readonly tasksService = inject(TasksService);

  readonly tasks = this.tasksService.tasks;
  readonly loading = this.tasksService.loading;
  readonly error = this.tasksService.error;

  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  private loadSubscription: Subscription | null = null;

  ngOnInit(): void {
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

  getCompletedTasks(): Task[] {
    return this.tasks().filter(task => task.status === 'Completed');
  }

  approveTask(task: Task): void {
    if (!confirm(`Approve and finalize "${task.title}"?`)) {
      return;
    }

    // TODO: Implement approve endpoint when available
    // For now, we'll just show a message
    this.successMessage.set(`Task "${task.title}" approved successfully.`);
    setTimeout(() => this.successMessage.set(null), 3000);
  }

  rejectTask(task: Task): void {
    if (!confirm(`Reject "${task.title}"? The editor will need to revise it.`)) {
      return;
    }

    // Reject by setting status back to InProgress
    this.tasksService.updateTaskStatus(task.id, { status: 'InProgress' }).subscribe({
      next: () => {
        this.successMessage.set(`Task "${task.title}" rejected. Editor will be notified.`);
        setTimeout(() => this.successMessage.set(null), 3000);
      },
      error: (error) => {
        console.error('Failed to reject task', error);
        this.errorMessage.set(error?.message || 'Failed to reject task. Please try again.');
        setTimeout(() => this.errorMessage.set(null), 5000);
      },
    });
  }

  trackTaskById(_: number, task: Task): string {
    return task.id;
  }
}

