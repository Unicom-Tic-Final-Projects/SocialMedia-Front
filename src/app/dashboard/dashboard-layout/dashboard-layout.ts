import { Component, OnInit, inject, signal, effect } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { UserDto } from '../../models/auth.models';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './dashboard-layout.html',
  styleUrl: './dashboard-layout.css',
})
export class DashboardLayout implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  // Expose auth service signals directly
  readonly user = this.authService.user;
  readonly isAgency = this.authService.isAgency;
  readonly isIndividual = this.authService.isIndividual;
  
  showUserMenu = signal(false);

  constructor() {
    // React to user changes
    effect(() => {
      const currentUser = this.authService.user();
      if (!currentUser) {
        // If no user, try to load from API
        this.authService.loadCurrentUser().subscribe();
      }
    });
  }

  ngOnInit(): void {
    // Load current user if not already loaded
    const currentUser = this.authService.user();
    if (!currentUser) {
      this.authService.loadCurrentUser().subscribe();
    }
  }

  toggleUserMenu(): void {
    this.showUserMenu.update(value => !value);
  }

  logout(): void {
    this.authService.logout();
  }

  getUserDisplayName(): string {
    const user = this.user();
    if (user?.tenantName) {
      return user.tenantName;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'User';
  }

  getUserInitials(): string {
    const name = this.getUserDisplayName();
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
}
