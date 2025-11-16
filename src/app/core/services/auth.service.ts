import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, map, of } from 'rxjs';
import { API_BASE_URL } from '../../config/api.config';
import { LoginRequest, RegisterRequest, AuthResponse, UserDto, ApiResponse } from '../../models/auth.models';

const TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'user_data';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly baseUrl = inject(API_BASE_URL);

  // User state signals
  private readonly userSignal = signal<UserDto | null>(this.loadUserFromStorage());
  readonly user = this.userSignal.asReadonly();

  private readonly tokenSignal = signal<string | null>(this.getTokenFromStorage());
  readonly token = this.tokenSignal.asReadonly();

  // Computed properties
  readonly isAuthenticated = computed(() => this.tokenSignal() !== null && this.userSignal() !== null);
  readonly isAgency = computed(() => this.userSignal()?.tenantType === 'Agency');
  readonly isIndividual = computed(() => this.userSignal()?.tenantType === 'Individual');

  constructor() {
    // Load user from storage on initialization
    this.loadUserFromStorage();
  }

  /**
   * Login user
   */
  login(request: LoginRequest): Observable<ApiResponse<AuthResponse>> {
    console.log('[AuthService] Login request:', request);
    return this.http.post<ApiResponse<AuthResponse>>(`${this.baseUrl}/api/auth/login`, request).pipe(
      tap(response => {
        console.log('[AuthService] Login response:', response);
        if (response && response.success && response.data) {
          this.setAuthData(response.data);
        } else {
          console.warn('[AuthService] Login response missing success or data:', response);
        }
      }),
      catchError(error => {
        console.error('[AuthService] Login error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Register new user
   */
  register(request: RegisterRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.baseUrl}/api/auth/register`, request).pipe(
      tap(response => {
        if (response.success && response.data) {
          this.setAuthData(response.data);
        }
      }),
      catchError(error => {
        console.error('Registration error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Logout user
   */
  logout(): void {
    const currentRole = this.userSignal()?.role?.toLowerCase() ?? '';
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    
    if (refreshToken) {
      this.http
        .post<ApiResponse<boolean>>(`${this.baseUrl}/api/auth/logout`, { refreshToken })
        .pipe(
          catchError(() => of(null))
        )
        .subscribe();
    }

    this.clearAuthData();
    const isAdmin = currentRole.includes('admin');
    this.router.navigate([isAdmin ? '/admin/login' : '/auth/login']);
  }

  /**
   * Refresh access token
   */
  refreshToken(): Observable<ApiResponse<AuthResponse>> {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    return this.http.post<ApiResponse<AuthResponse>>(`${this.baseUrl}/api/auth/refresh`, { refreshToken }).pipe(
      tap(response => {
        if (response.success && response.data) {
          this.setAuthData(response.data);
        }
      }),
      catchError(error => {
        console.error('Token refresh error:', error);
        // If refresh fails, logout user
        this.logout();
        return throwError(() => error);
      })
    );
  }

  /**
   * Get current user information
   */
  getCurrentUser(): Observable<ApiResponse<UserDto>> {
    return this.http.get<ApiResponse<UserDto>>(`${this.baseUrl}/api/auth/me`);
  }

  /**
   * Load current user from API
   */
  loadCurrentUser(): Observable<UserDto | null> {
    return this.getCurrentUser().pipe(
      map((response) => {
        if (response.success && response.data) {
          this.userSignal.set(response.data);
          localStorage.setItem(USER_KEY, JSON.stringify(response.data));
          return response.data;
        }
        return null;
      }),
      catchError((error) => {
        if (error.status === 401) {
          this.clearAuthData();
        }
        return of(null);
      })
    );
  }

  /**
   * Get access token
   */
  getToken(): string | null {
    return this.tokenSignal();
  }

  /**
   * Check if user is authenticated
   */
  isLoggedIn(): boolean {
    return this.isAuthenticated();
  }

  /**
   * Get user type
   */
  getUserType(): 'Agency' | 'Individual' | 'System' | null {
    return this.userSignal()?.tenantType || null;
  }

  /**
   * Set authentication data
   */
  private setAuthData(authResponse: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, authResponse.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, authResponse.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(authResponse.user));

    this.tokenSignal.set(authResponse.accessToken);
    this.userSignal.set(authResponse.user);
  }

  /**
   * Clear authentication data
   */
  private clearAuthData(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);

    this.tokenSignal.set(null);
    this.userSignal.set(null);
  }

  /**
   * Load user from localStorage
   */
  private loadUserFromStorage(): UserDto | null {
    try {
      const userData = localStorage.getItem(USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch {
      return null;
    }
  }

  /**
   * Get token from localStorage
   */
  private getTokenFromStorage(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }
}

