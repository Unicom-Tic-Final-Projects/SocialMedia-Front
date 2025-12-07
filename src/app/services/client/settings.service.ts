import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { AccountSettings } from '../../models/social.models';
import { API_BASE_URL } from '../../config/api.config';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  fetchSettings(_userId = 1): Observable<AccountSettings> {
    // Note: Backend doesn't have settings endpoint yet
    // Using default settings as placeholder
    return of({
      timezone: 'UTC',
      language: 'English',
      emailNotifications: true,
      pushNotifications: false,
    });
  }

  updateSettings(_userId: number, changes: Partial<AccountSettings>): Observable<AccountSettings> {
    // Note: Backend doesn't have settings update endpoint yet
    // This is a placeholder that returns updated settings
    return of({
      timezone: changes.timezone || 'UTC',
      language: changes.language || 'English',
      emailNotifications: changes.emailNotifications ?? true,
      pushNotifications: changes.pushNotifications ?? false,
    });
  }

  private mapSettings(_user: unknown): AccountSettings {
    return {
      timezone: 'UTC',
      language: 'English',
      emailNotifications: true,
      pushNotifications: false,
    };
  }
}
