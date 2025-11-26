import { Component, Input, Output, EventEmitter, inject, computed } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-admin-sidebar',
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class AdminSidebar {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  
  @Input() isCollapsed = false;
  @Output() toggleCollapse = new EventEmitter<void>();

  readonly user = this.authService.user;

  readonly displayName = computed(() => {
    const user = this.user();
    if (!user) return 'Admin';
    if (user.tenantName) return user.tenantName;
    if (user.email) return user.email.split('@')[0];
    return 'Admin';
  });

  readonly displayEmail = computed(() => {
    const user = this.user();
    return user?.email || 'admin@onevo.com';
  });

  readonly avatarInitials = computed(() => {
    const name = this.displayName().trim();
    if (!name) return 'A';
    const parts = name.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 1).toUpperCase();
  });

  menuItems = [
    { path: '/admin', icon: 'fas fa-home', label: 'Overview' },
    { path: '/admin/analytics', icon: 'fas fa-chart-line', label: 'Analytics' },
    { path: '/admin/users', icon: 'fas fa-users', label: 'Users' },
    { path: '/admin/posts', icon: 'fas fa-file-alt', label: 'Posts' },
    { path: '/admin/reports', icon: 'fas fa-chart-bar', label: 'Reports' },
    { path: '/admin/settings', icon: 'fas fa-cog', label: 'Settings' },
  ];

  onToggleCollapse() {
    this.toggleCollapse.emit();
  }

  logout() {
    this.authService.logout();
  }
}

