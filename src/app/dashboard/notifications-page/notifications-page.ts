import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationsService } from '../../services/client/notifications.service';
import { NotificationItem } from '../../models/social.models';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmationService } from '../../core/services/confirmation.service';

@Component({
  selector: 'app-notifications-page',
  imports: [CommonModule],
  templateUrl: './notifications-page.html',
  styleUrl: './notifications-page.css',
})
export class NotificationsPage implements OnInit {
  private readonly notificationsService = inject(NotificationsService);
  private readonly toastService = inject(ToastService);
  private readonly confirmationService = inject(ConfirmationService);

  notifications = signal<NotificationItem[]>([]);
  loading = signal(false);
  filter = signal<'all' | 'unread' | 'read'>('all');

  ngOnInit(): void {
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.loading.set(true);
    const isRead = this.filter() === 'all' ? undefined : this.filter() === 'read';

    this.notificationsService.refresh(50, isRead).subscribe({
      next: (notifications) => {
        this.notifications.set(notifications);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading notifications:', error);
        this.notifications.set([]);
        this.loading.set(false);
      }
    });
  }

  setFilter(filter: 'all' | 'unread' | 'read'): void {
    this.filter.set(filter);
    this.loadNotifications();
  }

  markAsRead(notification: NotificationItem): void {
    if (notification.read) {
      return;
    }

    this.notificationsService.markAsRead(notification.id).subscribe({
      next: () => {
        this.notifications.update((items) =>
          items.map((item) => (item.id === notification.id ? { ...item, read: true } : item))
        );
      },
      error: (error) => {
        console.error('Error marking notification as read:', error);
      }
    });
  }

  deleteNotification(notification: NotificationItem): void {
    this.confirmationService.confirm({
      title: 'Delete Notification',
      message: 'Are you sure you want to delete this notification?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmButtonClass: 'bg-red-500 hover:bg-red-600'
    }).then((confirmed) => {
      if (confirmed) {
        this.notificationsService.deleteNotification(notification.id).subscribe({
          next: () => {
            this.notifications.update((items) => items.filter((item) => item.id !== notification.id));
            this.toastService.success('Notification deleted successfully');
          },
          error: (error) => {
            console.error('Error deleting notification:', error);
            this.toastService.error('Failed to delete notification');
          }
        });
      }
    });
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'comment':
        return 'fa-comment';
      case 'mention':
        return 'fa-at';
      case 'system':
        return 'fa-bell';
      default:
        return 'fa-info-circle';
    }
  }

  getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    } else {
      return date.toLocaleDateString();
    }
  }
}
