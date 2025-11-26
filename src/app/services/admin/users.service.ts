import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../config/api.config';
import { ApiResponse } from '../../models/auth.models';

export interface AdminUserResponse {
  userId: string;
  email: string;
  role: string;
  tenantId: string;
  tenantName: string;
  tenantType: string;
  createdAt: string;
  isActive: boolean;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  role: string;
  tenantId: string;
  clientId?: string;
}

export interface UpdateUserRequest {
  email?: string;
  password?: string;
  role?: string;
  tenantId?: string;
  clientId?: string;
  isActive?: boolean;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  getUsers(): Observable<ApiResponse<AdminUserResponse[]>> {
    return this.http.get<ApiResponse<AdminUserResponse[]>>(`${this.baseUrl}/api/admin/users`);
  }

  getUserById(userId: string): Observable<ApiResponse<AdminUserResponse>> {
    return this.http.get<ApiResponse<AdminUserResponse>>(`${this.baseUrl}/api/admin/users/${userId}`);
  }

  createUser(request: CreateUserRequest): Observable<ApiResponse<AdminUserResponse>> {
    return this.http.post<ApiResponse<AdminUserResponse>>(`${this.baseUrl}/api/admin/users`, request);
  }

  updateUser(userId: string, request: UpdateUserRequest): Observable<ApiResponse<AdminUserResponse>> {
    return this.http.put<ApiResponse<AdminUserResponse>>(`${this.baseUrl}/api/admin/users/${userId}`, request);
  }

  deleteUser(userId: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/api/admin/users/${userId}`);
  }

  getTenants(): Observable<ApiResponse<AdminTenantResponse[]>> {
    return this.http.get<ApiResponse<AdminTenantResponse[]>>(`${this.baseUrl}/api/admin/tenants`);
  }

  getTenantById(tenantId: string): Observable<ApiResponse<AdminTenantResponse>> {
    return this.http.get<ApiResponse<AdminTenantResponse>>(`${this.baseUrl}/api/admin/tenants/${tenantId}`);
  }

  createTenant(request: CreateTenantRequest): Observable<ApiResponse<AdminTenantResponse>> {
    return this.http.post<ApiResponse<AdminTenantResponse>>(`${this.baseUrl}/api/admin/tenants`, request);
  }

  updateTenant(tenantId: string, request: UpdateTenantRequest): Observable<ApiResponse<AdminTenantResponse>> {
    return this.http.put<ApiResponse<AdminTenantResponse>>(`${this.baseUrl}/api/admin/tenants/${tenantId}`, request);
  }

  deleteTenant(tenantId: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/api/admin/tenants/${tenantId}`);
  }
}

export interface AdminTenantResponse {
  tenantId: string;
  name: string;
  tenantType: string;
  createdAt: string;
  isActive: boolean;
}

export interface CreateTenantRequest {
  name: string;
  tenantType: 'Individual' | 'Agency';
  ownerEmail?: string;
  ownerPassword?: string;
}

export interface UpdateTenantRequest {
  name?: string;
  tenantType?: 'Individual' | 'Agency';
  isActive?: boolean;
}

