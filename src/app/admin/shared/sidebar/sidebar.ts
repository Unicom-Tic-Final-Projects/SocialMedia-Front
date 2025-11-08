import { Component, Input, Output, EventEmitter } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-sidebar',
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class AdminSidebar {
  @Input() isCollapsed = false;
  @Output() toggleCollapse = new EventEmitter<void>();

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
}

