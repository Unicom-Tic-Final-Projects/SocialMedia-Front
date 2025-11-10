import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { AccountSettings, UserProfile } from '../models/social.models';
import { API_BASE_URL } from '../config/api.config';

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
    return this.http.get<any>(`${this.baseUrl}/users/${userId}`).pipe(
      map((user) => this.mapProfile(user)),
      tap((profile) => this.profileSignal.set(profile))
    );
  }

  updateProfile(userId: number, changes: Partial<UserProfile>): Observable<UserProfile> {
    return this.http.put<any>(`${this.baseUrl}/users/${userId}`, changes).pipe(
      map((user) => this.mapProfile(user)),
      tap((profile) => this.profileSignal.set(profile))
    );
  }

  loadSettings(userId = 1): Observable<AccountSettings> {
    return this.http.get<any>(`${this.baseUrl}/users/${userId}`).pipe(map((user) => this.mapSettings(user)));
  }

  updateSettings(userId: number, changes: Partial<AccountSettings>): Observable<AccountSettings> {
    return this.http.put<any>(`${this.baseUrl}/users/${userId}`, changes).pipe(map((user) => this.mapSettings(user)));
  }

  private mapProfile(user: any): UserProfile {
    return {
      id: user.id,
      fullName: `${user.firstName} ${user.lastName}`,
      email: user.email,
      avatarUrl: user.image,
      role: user.company?.title,
      location: user.address?.city,
      bio: user.company?.department,
    };
  }

  private mapSettings(user: any): AccountSettings {
    return {
      timezone: user.bank?.cardType ?? 'UTC',
      language: user.company?.department ?? 'English',
      emailNotifications: true,
      pushNotifications: false,
    };
  }
}
