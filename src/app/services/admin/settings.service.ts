import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private baseUrl = 'https://jsonplaceholder.typicode.com';

  constructor(private http: HttpClient) {}

  getSettings(): Observable<any> {
    // Using a single post as mock settings data
    return this.http.get<any>(`${this.baseUrl}/posts/1`);
  }

  updateSettings(settings: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/posts/1`, settings);
  }

  getGeneralSettings(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/posts/1`);
  }

  updateGeneralSettings(settings: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/posts/1`, settings);
  }

  getSecuritySettings(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/posts/2`);
  }

  updateSecuritySettings(settings: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/posts/2`, settings);
  }

  getNotificationSettings(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/posts/3`);
  }

  updateNotificationSettings(settings: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/posts/3`, settings);
  }
}

