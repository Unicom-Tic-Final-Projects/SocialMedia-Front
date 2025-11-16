import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, tap, throwError } from 'rxjs';
import { API_BASE_URL } from '../../config/api.config';
import { TeamMember, CreateTeamMemberRequest, UpdateTeamMemberRequest } from '../../models/team-member.models';

@Injectable({
  providedIn: 'root',
})
export class TeamMembersService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  private readonly teamMembersSignal = signal<TeamMember[]>([]);
  readonly teamMembers = this.teamMembersSignal.asReadonly();

  private readonly loadingSignal = signal(false);
  readonly loading = this.loadingSignal.asReadonly();

  private readonly errorSignal = signal<string | null>(null);
  readonly error = this.errorSignal.asReadonly();

  /**
   * Load team members for the current tenant
   */
  loadTeamMembers() {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.get<TeamMember[]>(`${this.baseUrl}/api/auth/team-members`).pipe(
      tap((members) => {
        this.teamMembersSignal.set(members);
        this.loadingSignal.set(false);
      }),
      catchError((error) => {
        this.errorSignal.set(error?.message || 'Failed to load team members');
        this.loadingSignal.set(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Create a new team member
   */
  createTeamMember(request: CreateTeamMemberRequest) {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    // TenantId will be set by backend from the authenticated user's token
    return this.http.post<TeamMember>(`${this.baseUrl}/api/auth/team-member`, {
      email: request.email,
      password: request.password,
      role: request.role || 'Editor',
    }).pipe(
      tap((member) => {
        this.teamMembersSignal.update((members) => [member, ...members]);
        this.loadingSignal.set(false);
      }),
      catchError((error) => {
        this.errorSignal.set(error?.message || 'Failed to create team member');
        this.loadingSignal.set(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Update an existing team member
   */
  updateTeamMember(memberId: string, request: UpdateTeamMemberRequest) {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.put<TeamMember>(`${this.baseUrl}/api/auth/team-member/${memberId}`, request).pipe(
      tap((updatedMember) => {
        this.teamMembersSignal.update((members) =>
          members.map((member) => (member.userId === memberId ? updatedMember : member))
        );
        this.loadingSignal.set(false);
      }),
      catchError((error) => {
        this.errorSignal.set(error?.message || 'Failed to update team member');
        this.loadingSignal.set(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Delete a team member
   */
  deleteTeamMember(memberId: string) {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.delete<boolean>(`${this.baseUrl}/api/auth/team-member/${memberId}`).pipe(
      tap(() => {
        this.teamMembersSignal.update((members) => members.filter((member) => member.userId !== memberId));
        this.loadingSignal.set(false);
      }),
      catchError((error) => {
        this.errorSignal.set(error?.message || 'Failed to delete team member');
        this.loadingSignal.set(false);
        return throwError(() => error);
      })
    );
  }
}

