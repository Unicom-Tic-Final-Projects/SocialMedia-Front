import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { NotificationItem } from '../models/social.models';
import { API_BASE_URL } from '../config/api.config';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  private readonly notificationsSignal = signal<NotificationItem[]>([]);
  readonly notifications = this.notificationsSignal.asReadonly();

  constructor() {
    this.refresh().subscribe();
  }

  refresh(limit = 15): Observable<NotificationItem[]> {
    return this.http
      .get<{ comments: any[] }>(`${this.baseUrl}/comments`, { params: { limit } as any })
      .pipe(
        map(({ comments }) => comments.map((comment) => this.mapNotification(comment))),
        tap((items) => this.notificationsSignal.set(items))
      );
  }

  markAsRead(id: number): void {
    this.notificationsSignal.update((items) =>
      items.map((item) => (item.id === id ? { ...item, read: true } : item))
    );
  }

  private mapNotification(comment: any): NotificationItem {
    const createdAt = new Date();
    createdAt.setMinutes(createdAt.getMinutes() - comment.id * 5);
    const types: NotificationItem['type'][] = ['comment', 'mention', 'alert'];
    return {
      id: comment.id,
      source: `@${comment.user?.username ?? 'user'}`,
      message: comment.body,
      type: types[comment.id % types.length],
      createdAt: createdAt.toISOString(),
      read: false,
    };
  }
}
