import { Component, OnInit, effect, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-agency-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './agency-layout.html',
  styleUrl: './agency-layout.css',
})
export class AgencyLayout implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly user = this.authService.user;
  readonly showMenu = signal(false);

  constructor() {
    effect(() => {
      if (!this.authService.user()) {
        this.authService.loadCurrentUser().subscribe();
      }
    });
  }

  ngOnInit(): void {
    if (!this.authService.user()) {
      this.authService.loadCurrentUser().subscribe();
    }
  }

  toggleMenu(): void {
    this.showMenu.update((value) => !value);
  }

  logout(): void {
    this.authService.logout();
  }

  getTenantName(): string {
    return this.user()?.tenantName ?? 'Agency Workspace';
  }

  getUserEmail(): string {
    return this.user()?.email ?? '';
  }
}

