import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { AccountSettings } from '../models/social.models';
import { API_BASE_URL } from '../config/api.config';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  fetchSettings(userId = 1): Observable<AccountSettings> {
    return this.http.get<any>(`${this.baseUrl}/users/${userId}`).pipe(map((user) => this.mapSettings(user)));
  }

  updateSettings(userId: number, changes: Partial<AccountSettings>): Observable<AccountSettings> {
    return this.http.put<any>(`${this.baseUrl}/users/${userId}`, changes).pipe(map((user) => this.mapSettings(user)));
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
