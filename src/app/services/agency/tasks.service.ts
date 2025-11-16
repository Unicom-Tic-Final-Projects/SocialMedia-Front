import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, tap, throwError } from 'rxjs';
import { API_BASE_URL } from '../../config/api.config';
import { Task, CreateTaskRequest, UpdateTaskRequest, UpdateTaskStatusRequest } from '../../models/task.models';

@Injectable({
  providedIn: 'root',
})
export class AgencyTasksService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  private readonly tasksSignal = signal<Task[]>([]);
  readonly tasks = this.tasksSignal.asReadonly();

  private readonly loadingSignal = signal(false);
  readonly loading = this.loadingSignal.asReadonly();

  private readonly errorSignal = signal<string | null>(null);
  readonly error = this.errorSignal.asReadonly();

  /**
   * Load all tasks for the current tenant (agency)
   */
  loadTasks() {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.get<Task[]>(`${this.baseUrl}/api/tasks/tenant`).pipe(
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
   * Create a new task
   */
  createTask(request: CreateTaskRequest) {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.post<Task>(`${this.baseUrl}/api/tasks`, request).pipe(
      tap((task) => {
        this.tasksSignal.update((tasks) => [task, ...tasks]);
        this.loadingSignal.set(false);
      }),
      catchError((error) => {
        this.errorSignal.set(error?.message || 'Failed to create task');
        this.loadingSignal.set(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Update an existing task
   */
  updateTask(taskId: string, request: UpdateTaskRequest) {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.put<Task>(`${this.baseUrl}/api/tasks/${taskId}`, request).pipe(
      tap((updatedTask) => {
        this.tasksSignal.update((tasks) =>
          tasks.map((task) => (task.id === taskId ? updatedTask : task))
        );
        this.loadingSignal.set(false);
      }),
      catchError((error) => {
        this.errorSignal.set(error?.message || 'Failed to update task');
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
   * Delete a task
   */
  deleteTask(taskId: string) {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.delete<boolean>(`${this.baseUrl}/api/tasks/${taskId}`).pipe(
      tap(() => {
        this.tasksSignal.update((tasks) => tasks.filter((task) => task.id !== taskId));
        this.loadingSignal.set(false);
      }),
      catchError((error) => {
        this.errorSignal.set(error?.message || 'Failed to delete task');
        this.loadingSignal.set(false);
        return throwError(() => error);
      })
    );
  }
}

