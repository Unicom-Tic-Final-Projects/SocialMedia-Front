import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, tap, throwError } from 'rxjs';
import { API_BASE_URL } from '../../config/api.config';
import { Task, UpdateTaskStatusRequest } from '../../models/task.models';

@Injectable({
  providedIn: 'root',
})
export class TasksService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  private readonly tasksSignal = signal<Task[]>([]);
  readonly tasks = this.tasksSignal.asReadonly();

  private readonly loadingSignal = signal(false);
  readonly loading = this.loadingSignal.asReadonly();

  private readonly errorSignal = signal<string | null>(null);
  readonly error = this.errorSignal.asReadonly();

  /**
   * Load tasks assigned to the current user
   */
  loadAssignedTasks() {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.get<Task[]>(`${this.baseUrl}/api/tasks/assigned`).pipe(
      tap((tasks) => {
        this.tasksSignal.set(tasks);
        this.loadingSignal.set(false);
      }),
      catchError((error) => {
        this.errorSignal.set(error?.message || 'Failed to load tasks');
        this.loadingSignal.set(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Update task status
   */
  updateTaskStatus(taskId: string, request: UpdateTaskStatusRequest) {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.patch<Task>(`${this.baseUrl}/api/tasks/${taskId}/status`, request).pipe(
      tap((updatedTask) => {
        this.tasksSignal.update((tasks) =>
          tasks.map((task) => (task.id === taskId ? updatedTask : task))
        );
        this.loadingSignal.set(false);
      }),
      catchError((error) => {
        this.errorSignal.set(error?.message || 'Failed to update task status');
        this.loadingSignal.set(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Complete a task (for Editors)
   */
  completeTask(taskId: string) {
    return this.updateTaskStatus(taskId, { status: 'Completed' });
  }

  /**
   * Start working on a task (for Editors)
   */
  startTask(taskId: string) {
    return this.updateTaskStatus(taskId, { status: 'InProgress' });
  }

  /**
   * Get client access information for a task (returns clientId if allowed)
   */
  getTaskClientAccess(taskId: string) {
    return this.http.get<string>(`${this.baseUrl}/api/tasks/${taskId}/client-access`).pipe(
      catchError((error) => {
        this.errorSignal.set(error?.message || 'Failed to get client access for task');
        return throwError(() => error);
      })
    );
  }
}

