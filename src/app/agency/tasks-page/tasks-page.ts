import { Component, OnInit, OnDestroy, inject, signal, effect } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AgencyTasksService } from '../../services/agency/tasks.service';
import { TeamMembersService } from '../../services/agency/team-members.service';
import { ClientsService } from '../../services/client/clients.service';
import { Task, CreateTaskRequest, UpdateTaskRequest, TaskStatus, TaskPriority } from '../../models/task.models';
import { Subscription, forkJoin } from 'rxjs';

@Component({
  selector: 'app-agency-tasks-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatePipe],
  templateUrl: './tasks-page.html',
  styleUrl: './tasks-page.css',
})
export class AgencyTasksPage implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly tasksService = inject(AgencyTasksService);
  private readonly teamMembersService = inject(TeamMembersService);
  private readonly clientsService = inject(ClientsService);

  readonly tasks = this.tasksService.tasks;
  readonly loading = this.tasksService.loading;
  readonly error = this.tasksService.error;
  readonly teamMembers = this.teamMembersService.teamMembers;
  readonly clients = this.clientsService.clients;

  showModal = signal(false);
  isEditing = signal(false);
  editingTask = signal<Task | null>(null);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  taskForm = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    dueDate: [''],
    priority: ['Normal' as TaskPriority, [Validators.required]],
    assignedToUserId: [''],
    clientId: [''],
  });

  private subscriptions: Subscription[] = [];
  private refreshInterval: any;

  readonly statuses: { value: TaskStatus; label: string; color: string }[] = [
    { value: 'Pending', label: 'Pending', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    { value: 'InProgress', label: 'In Progress', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { value: 'Completed', label: 'Completed', color: 'bg-green-50 text-green-700 border-green-200' },
    { value: 'Cancelled', label: 'Cancelled', color: 'bg-red-50 text-red-700 border-red-200' },
  ];

  readonly priorities: { value: TaskPriority; label: string; color: string }[] = [
    { value: 'Low', label: 'Low', color: 'bg-gray-50 text-gray-700' },
    { value: 'Normal', label: 'Normal', color: 'bg-blue-50 text-blue-700' },
    { value: 'High', label: 'High', color: 'bg-red-50 text-red-700' },
  ];

  readonly lanes = [
    { status: 'Pending' as TaskStatus, title: 'Pending', tasks: signal<Task[]>([]) },
    { status: 'InProgress' as TaskStatus, title: 'In Progress', tasks: signal<Task[]>([]) },
    { status: 'Completed' as TaskStatus, title: 'Completed', tasks: signal<Task[]>([]) },
    { status: 'Cancelled' as TaskStatus, title: 'Cancelled', tasks: signal<Task[]>([]) },
  ];

  constructor() {
    // Watch for tasks changes and update lanes
    effect(() => {
      this.tasks(); // Access signal to trigger effect
      this.updateLanes();
    });
  }

  ngOnInit(): void {
    // Load all data
    const loadSub = forkJoin({
      tasks: this.tasksService.loadTasks(),
      teamMembers: this.teamMembersService.loadTeamMembers(),
      clients: this.clientsService.loadClients(),
    }).subscribe({
      next: () => {
        this.updateLanes();
      },
      error: (error) => {
        console.error('Failed to load data', error);
        this.errorMessage.set('Failed to load data. Please try again.');
        setTimeout(() => this.errorMessage.set(null), 5000);
      },
    });

    this.subscriptions.push(loadSub);

    // Auto-refresh tasks every 10 seconds to show updates from team members
    this.refreshInterval = setInterval(() => {
      this.tasksService.loadTasks().subscribe({
        error: (error) => {
          console.error('Failed to refresh tasks', error);
        },
      });
    }, 10000); // Refresh every 10 seconds
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  updateLanes(): void {
    const allTasks = this.tasks();
    this.lanes.forEach((lane) => {
      lane.tasks.set(allTasks.filter((task) => task.status === lane.status));
    });
  }

  openCreateModal(): void {
    this.isEditing.set(false);
    this.editingTask.set(null);
    this.taskForm.reset({
      priority: 'Normal',
    });
    this.errorMessage.set(null);
    this.showModal.set(true);
  }

  openEditModal(task: Task): void {
    this.isEditing.set(true);
    this.editingTask.set(task);
    this.errorMessage.set(null);
    this.taskForm.patchValue({
      title: task.title,
      description: task.description || '',
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      priority: task.priority,
      assignedToUserId: task.assignedToUserId || '',
      clientId: task.clientId || '',
    });
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.isEditing.set(false);
    this.editingTask.set(null);
    this.taskForm.reset();
    this.errorMessage.set(null);
  }

  saveTask(): void {
    if (this.taskForm.invalid) {
      this.taskForm.markAllAsTouched();
      return;
    }

    const formValue = this.taskForm.value;

    if (this.isEditing() && this.editingTask()) {
      const updateRequest: UpdateTaskRequest = {
        taskId: this.editingTask()!.id,
        title: formValue.title!,
        description: formValue.description || undefined,
        dueDate: formValue.dueDate ? new Date(formValue.dueDate).toISOString() : undefined,
        priority: formValue.priority as TaskPriority,
        assignedToUserId: formValue.assignedToUserId || undefined,
        clientId: formValue.clientId || undefined,
      };

      this.tasksService.updateTask(this.editingTask()!.id, updateRequest).subscribe({
        next: () => {
          this.successMessage.set('Task updated successfully');
          this.closeModal();
          setTimeout(() => this.successMessage.set(null), 3000);
        },
        error: (error) => {
          console.error('Failed to update task', error);
          this.errorMessage.set(error?.message || 'Failed to update task. Please try again.');
        },
      });
    } else {
      const createRequest: CreateTaskRequest = {
        title: formValue.title!,
        description: formValue.description || undefined,
        dueDate: formValue.dueDate ? new Date(formValue.dueDate).toISOString() : undefined,
        priority: formValue.priority as TaskPriority,
        assignedToUserId: formValue.assignedToUserId || undefined,
        clientId: formValue.clientId || undefined,
      };

      this.tasksService.createTask(createRequest).subscribe({
        next: () => {
          this.successMessage.set('Task created successfully');
          this.closeModal();
          setTimeout(() => this.successMessage.set(null), 3000);
        },
        error: (error) => {
          console.error('Failed to create task', error);
          this.errorMessage.set(error?.message || 'Failed to create task. Please try again.');
        },
      });
    }
  }

  deleteTask(task: Task): void {
    if (!confirm(`Are you sure you want to delete "${task.title}"? This action cannot be undone.`)) {
      return;
    }

    this.tasksService.deleteTask(task.id).subscribe({
      next: () => {
        this.successMessage.set('Task deleted successfully');
        setTimeout(() => this.successMessage.set(null), 3000);
      },
      error: (error) => {
        console.error('Failed to delete task', error);
        this.errorMessage.set(error?.message || 'Failed to delete task. Please try again.');
        setTimeout(() => this.errorMessage.set(null), 5000);
      },
    });
  }

  updateTaskStatus(task: Task, newStatus: TaskStatus): void {
    this.tasksService.updateTaskStatus(task.id, { status: newStatus }).subscribe({
      next: () => {
        this.successMessage.set('Task status updated successfully');
        setTimeout(() => this.successMessage.set(null), 3000);
      },
      error: (error) => {
        console.error('Failed to update task status', error);
        this.errorMessage.set(error?.message || 'Failed to update task status. Please try again.');
        setTimeout(() => this.errorMessage.set(null), 5000);
      },
    });
  }

  getStatusBadgeClass(status: TaskStatus): string {
    const statusConfig = this.statuses.find((s) => s.value === status);
    return statusConfig?.color || 'bg-gray-50 text-gray-700 border-gray-200';
  }

  getPriorityBadgeClass(priority: TaskPriority): string {
    const priorityConfig = this.priorities.find((p) => p.value === priority);
    return priorityConfig?.color || 'bg-gray-50 text-gray-700';
  }

  getClientName(clientId?: string): string {
    if (!clientId) return 'No Client';
    const client = this.clients().find((c) => c.id === clientId);
    return client?.name || 'Unknown Client';
  }

  getTeamMemberEmail(userId?: string): string {
    if (!userId) return 'Unassigned';
    const member = this.teamMembers().find((m) => m.userId === userId);
    return member?.email || 'Unknown';
  }

  trackTaskById(_: number, task: Task): string {
    return task.id;
  }
}
