import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap, catchError, of } from 'rxjs';
import { NotificationItem } from '../../models/social.models';
import { API_BASE_URL } from '../../config/api.config';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  private readonly notificationsSignal = signal<NotificationItem[]>([]);
  readonly notifications = this.notificationsSignal.asReadonly();

  constructor() {
    this.refresh().subscribe();
  }

  refresh(limit = 20, isRead?: boolean): Observable<NotificationItem[]> {
    const params: any = {
      PageNumber: '1',
      PageSize: limit.toString(),
    };

    if (isRead !== undefined) {
      params.IsRead = isRead.toString();
    }

    return this.http
      .get<any>(`${this.baseUrl}/api/notifications`, { params })
      .pipe(
        map((response) => {
          // Handle ApiResponse structure
          const notifications = response?.data || response || [];
          return Array.isArray(notifications) 
            ? notifications.map((notif: any) => this.mapNotification(notif))
            : [];
        }),
        tap((items) => this.notificationsSignal.set(items)),
        catchError((error) => {
          console.error('Error fetching notifications:', error);
          this.notificationsSignal.set([]);
          return of([]);
        })
      );
  }

  markAsRead(id: string | number): Observable<void> {
    return this.http.post<any>(`${this.baseUrl}/api/notifications/${id}/read`, {}).pipe(
      tap(() => {
        this.notificationsSignal.update((items) =>
          items.map((item) => (item.id === id ? { ...item, read: true } : item))
        );
      }),
      map(() => void 0),
      catchError((error) => {
        console.error('Error marking notification as read:', error);
        return of(void 0);
      })
    );
  }

  deleteNotification(id: string | number): Observable<void> {
    return this.http.delete<any>(`${this.baseUrl}/api/notifications/${id}`).pipe(
      tap(() => {
        this.notificationsSignal.update((items) => items.filter((item) => item.id !== id));
      }),
      map(() => void 0),
      catchError((error) => {
        console.error('Error deleting notification:', error);
        return of(void 0);
      })
    );
  }

  private mapNotification(notif: any): NotificationItem {
    // Map backend NotificationResponse to frontend NotificationItem
    const id = notif.id || notif.Id || notif.notificationId || 0;
    const source = notif.title || notif.Title || notif.source || 'System';
    const message = notif.message || notif.Message || notif.content || '';
    const type = (notif.type || notif.Type || 'system').toLowerCase();
    const createdAt = notif.createdAt || notif.CreatedAt || notif.timestamp || new Date().toISOString();
    const read = notif.isRead !== undefined ? notif.isRead : (notif.IsRead !== undefined ? notif.IsRead : false);

    // Map notification type to frontend type
    let mappedType: NotificationItem['type'] = 'alert';
    if (type === 'comment' || type === 'mention') {
      mappedType = type as 'comment' | 'mention';
    } else if (type === 'system') {
      mappedType = 'system';
    } else {
      mappedType = 'alert';
    }

    return {
      id: typeof id === 'string' ? parseInt(id, 10) || 0 : id,
      source,
      message,
      type: mappedType,
      createdAt,
      read,
    };
  }
}
