import { Component, Input, Output, EventEmitter, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-admin-navbar',
  imports: [CommonModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class AdminNavbar {
  private readonly authService = inject(AuthService);

  @Input() isSidebarCollapsed = false;
  @Output() toggleSidebar = new EventEmitter<void>();

  readonly user = this.authService.user;

  readonly displayName = computed(() => {
    const user = this.user();
    if (!user) {
      return 'Admin';
    }

    if (user.tenantName) {
      return user.tenantName;
    }

    if (user.email) {
      return user.email.split('@')[0];
    }

    return 'Admin';
  });

  readonly displayRole = computed(() => {
    const user = this.user();
    return user?.role || 'Administrator';
  });

  readonly avatarInitials = computed(() => {
    const name = this.displayName().trim();
    if (!name) {
      return 'AD';
    }

    const parts = name.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }

    return name.substring(0, 2).toUpperCase();
  });

  notifications = [
    { id: 1, message: 'New user registered', time: '5m ago', unread: true },
    { id: 2, message: 'Post scheduled successfully', time: '1h ago', unread: true },
  ];

  unreadCount = this.notifications.filter(n => n.unread).length;

  onToggleSidebar() {
    this.toggleSidebar.emit();
  }

  logout(): void {
    this.authService.logout();
  }
}

