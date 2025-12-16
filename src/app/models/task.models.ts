// Task models matching backend DTOs

export interface Task {
  id: string;
  workspaceId?: string;
  tenantId: string;
  clientId?: string;
  clientName?: string;
  createdByUserId: string;
  createdByEmail?: string;
  assignedToUserId?: string;
  assignedToEmail?: string;
  title: string;
  description?: string;
  dueDate?: string;
  status: 'Pending' | 'InProgress' | 'Completed' | 'Cancelled';
  priority: 'Low' | 'Normal' | 'High';
  createdAt: string;
  updatedAt?: string;
}

export interface CreateTaskRequest {
  workspaceId?: string;
  title: string;
  description?: string;
  dueDate?: string;
  priority?: 'Low' | 'Normal' | 'High';
  assignedToUserId?: string;
  clientId?: string;
}

export interface UpdateTaskRequest {
  taskId: string;
  title?: string;
  description?: string;
  dueDate?: string;
  priority?: 'Low' | 'Normal' | 'High';
  assignedToUserId?: string;
  clientId?: string;
}

export interface UpdateTaskStatusRequest {
  status: 'Pending' | 'InProgress' | 'Completed' | 'Cancelled';
}

export type TaskStatus = 'Pending' | 'InProgress' | 'Completed' | 'Cancelled';
export type TaskPriority = 'Low' | 'Normal' | 'High';

export interface TaskApprovalRequest {
  id: string;
  taskId: string;
  taskTitle?: string;
  requestedById: string;
  requestedByEmail?: string;
  assignedToUserId?: string;
  assignedToEmail?: string; // Email of the user assigned to the task
  reviewerId?: string;
  reviewerEmail?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  comment?: string;
  requestedAt: string;
  reviewedAt?: string;
  tenantId: string;
  clientId?: string;
  clientName?: string;
}

export interface ReviewTaskApprovalRequest {
  requestId: string;
  reviewerId: string;
  status: 'Approved' | 'Rejected';
  comment?: string;
}
