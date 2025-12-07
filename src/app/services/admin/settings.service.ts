import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

interface Settings {
  id?: number;
  title?: string;
  body?: string;
  userId?: number;
  [key: string]: unknown;
}

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'https://jsonplaceholder.typicode.com';

  getSettings(): Observable<Settings> {
    // Using a single post as mock settings data
    return this.http.get<Settings>(`${this.baseUrl}/posts/1`);
  }

  updateSettings(settings: Settings): Observable<Settings> {
    return this.http.put<Settings>(`${this.baseUrl}/posts/1`, settings);
  }

  getGeneralSettings(): Observable<Settings> {
    return this.http.get<Settings>(`${this.baseUrl}/posts/1`);
  }

  updateGeneralSettings(settings: Settings): Observable<Settings> {
    return this.http.put<Settings>(`${this.baseUrl}/posts/1`, settings);
  }

  getSecuritySettings(): Observable<Settings> {
    return this.http.get<Settings>(`${this.baseUrl}/posts/2`);
  }

  updateSecuritySettings(settings: Settings): Observable<Settings> {
    return this.http.put<Settings>(`${this.baseUrl}/posts/2`, settings);
  }

  getNotificationSettings(): Observable<Settings> {
    return this.http.get<Settings>(`${this.baseUrl}/posts/3`);
  }

  updateNotificationSettings(settings: Settings): Observable<Settings> {
    return this.http.put<Settings>(`${this.baseUrl}/posts/3`, settings);
  }
}
