import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-navbar',
  imports: [CommonModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class AdminNavbar {
  @Input() isSidebarCollapsed = false;
  @Output() toggleSidebar = new EventEmitter<void>();

  notifications = [
    { id: 1, message: 'New user registered', time: '5m ago', unread: true },
    { id: 2, message: 'Post scheduled successfully', time: '1h ago', unread: true },
  ];

  unreadCount = this.notifications.filter(n => n.unread).length;

  onToggleSidebar() {
    this.toggleSidebar.emit();
  }
}

