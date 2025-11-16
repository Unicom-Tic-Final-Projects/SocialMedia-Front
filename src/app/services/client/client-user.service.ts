import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { API_BASE_URL } from '../../config/api.config';
import { ClientUser, CreateClientUserRequest } from '../../models/client-user.models';
import { AuthResponse } from '../../models/auth.models';

@Injectable({
  providedIn: 'root',
})
export class ClientUserService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  /**
   * Create a user account for a client (individual account under agency)
   * Note: This endpoint returns full ApiResponse structure (not unwrapped by interceptor)
   */
  createClientUser(request: CreateClientUserRequest) {
    return this.http.post<{ success: boolean; data: ClientUser; message?: string }>(`${this.baseUrl}/api/auth/client-user`, {
      clientId: request.clientId,
      email: request.email,
      password: request.password, // Optional - will be auto-generated if not provided
    }).pipe(
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }

  /**
   * Get user account for a client
   */
  getClientUser(clientId: string) {
    return this.http.get<ClientUser>(`${this.baseUrl}/api/auth/client-user/${clientId}`).pipe(
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }

  /**
   * Access client's dashboard (impersonate client user)
   * Returns auth tokens to login as the client user
   */
  accessClientDashboard(clientId: string) {
    return this.http.post<AuthResponse>(`${this.baseUrl}/api/auth/client-user/${clientId}/access`, {}).pipe(
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }
}

