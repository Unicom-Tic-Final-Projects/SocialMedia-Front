import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap, of } from 'rxjs';
import { AccountSettings, UserProfile } from '../../models/social.models';
import { API_BASE_URL } from '../../config/api.config';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  private readonly profileSignal = signal<UserProfile | null>(null);
  readonly profile = this.profileSignal.asReadonly();

  constructor() {
    this.loadProfile().subscribe();
  }

  loadProfile(userId = 1): Observable<UserProfile> {
    return this.http.get<any>(`${this.baseUrl}/api/auth/me`).pipe(
      map((response) => {
        const user = response?.data || response || {};
        return this.mapProfile(user);
      }),
      tap((profile) => this.profileSignal.set(profile))
    );
  }

  updateProfile(userId: number, changes: Partial<UserProfile>): Observable<UserProfile> {
    // Note: Backend doesn't have user profile update endpoint yet
    // This is a placeholder that updates local state
    const currentProfile = this.profileSignal();
    if (currentProfile) {
      const updatedProfile = { ...currentProfile, ...changes };
      this.profileSignal.set(updatedProfile);
      return of(updatedProfile);
    }
    return this.loadProfile(userId);
  }

  loadSettings(userId = 1): Observable<AccountSettings> {
    // Note: Backend doesn't have settings endpoint yet
    // Using default settings as placeholder
    return of({
      timezone: 'UTC',
      language: 'English',
      emailNotifications: true,
      pushNotifications: false,
    });
  }

  updateSettings(userId: number, changes: Partial<AccountSettings>): Observable<AccountSettings> {
    // Note: Backend doesn't have settings update endpoint yet
    // This is a placeholder that returns updated settings
    return of({
      timezone: changes.timezone || 'UTC',
      language: changes.language || 'English',
      emailNotifications: changes.emailNotifications ?? true,
      pushNotifications: changes.pushNotifications ?? false,
    });
  }

  private mapProfile(user: any): UserProfile {
    return {
      id: user.userId || user.id || 0,
      fullName: user.fullName || user.email?.split('@')[0] || 'User',
      email: user.email || '',
      avatarUrl: user.avatarUrl || user.profilePictureUrl || undefined,
      role: user.role || '',
      location: undefined,
      bio: undefined,
    };
  }

  private mapSettings(user: any): AccountSettings {
    return {
      timezone: 'UTC',
      language: 'English',
      emailNotifications: true,
      pushNotifications: false,
    };
  }
}
