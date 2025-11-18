import { Component, OnInit, effect, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { ClientsService } from '../../services/client/clients.service';
import { ClientContextService } from '../../services/client/client-context.service';

@Component({
  selector: 'app-team-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './team-layout.html',
  styleUrl: './team-layout.css',
})
export class TeamLayout implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly clientsService = inject(ClientsService);
  private readonly clientContextService = inject(ClientContextService);

  readonly user = this.authService.user;
  readonly showMenu = signal(false);
  readonly isAdmin = signal(false);
  readonly isEditor = signal(false);

  // Client context for team members
  readonly selectedClient = this.clientContextService.selectedClient;
  readonly showClientSidebar = signal(false);
  readonly isTeamSidebarCollapsed = signal(false);

  constructor() {
    effect(() => {
      const currentUser = this.authService.user();
      if (currentUser) {
        this.isAdmin.set(currentUser.role === 'Admin');
        this.isEditor.set(currentUser.role === 'Editor');
      }
    });

    effect(() => {
      if (!this.authService.user()) {
        this.authService.loadCurrentUser().subscribe();
      }
    });

    // Load clients when user is available (for client dashboards)
    effect(() => {
      const user = this.authService.user();
      if (user) {
        this.clientsService.loadClients().subscribe();
      }
    });

    // Show client sidebar and collapse team sidebar when a client is selected
    effect(() => {
      const client = this.selectedClient();
      this.showClientSidebar.set(client !== null);
      this.isTeamSidebarCollapsed.set(client !== null);
    });

    // Watch for route changes to set client context
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateClientContextFromRoute();
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
    return this.user()?.tenantName ?? 'Team Workspace';
  }

  getUserEmail(): string {
    return this.user()?.email ?? '';
  }

  getUserRole(): string {
    return this.user()?.role ?? 'Editor';
  }

  private updateClientContextFromRoute(): void {
    const url = this.router.url;
    const clientMatch = url.match(/\/team\/client\/([^\/]+)/);

    if (clientMatch) {
      const clientId = clientMatch[1];
      const clients = this.clientsService.clients();

      if (!clients || clients.length === 0) {
        this.clientsService.loadClients().subscribe({
          next: () => {
            setTimeout(() => this.setClientFromId(clientId), 200);
          },
        });
        return;
      }

      this.setClientFromId(clientId);
    } else {
      if (this.selectedClient()) {
        this.clientContextService.clearSelectedClient();
      }
    }
  }

  private setClientFromId(clientId: string): void {
    const clients = this.clientsService.clients();
    const client = clients.find((c) => c.id === clientId);

    if (client) {
      this.clientContextService.selectClient(client);
    }
  }
}

