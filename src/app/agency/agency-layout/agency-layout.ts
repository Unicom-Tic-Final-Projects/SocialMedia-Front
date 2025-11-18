import { Component, OnInit, effect, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, ActivatedRoute, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { ClientContextService } from '../../services/client/client-context.service';
import { ClientsService } from '../../services/client/clients.service';

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
  private readonly route = inject(ActivatedRoute);
  readonly clientContextService = inject(ClientContextService); // Public for template access
  private readonly clientsService = inject(ClientsService);

  readonly user = this.authService.user;
  readonly showMenu = signal(false);
  readonly showClientSidebar = signal(false);
  readonly isAgencySidebarCollapsed = signal(false);
  
  // Client context
  readonly selectedClient = this.clientContextService.selectedClient;
  readonly clientUser = this.clientContextService.clientUser;
  readonly clientsWithAccounts = this.clientContextService.clientsWithAccounts;

  constructor() {
    effect(() => {
      if (!this.authService.user()) {
        this.authService.loadCurrentUser().subscribe();
      }
    });

    // Load clients when user is available
    effect(() => {
      const user = this.authService.user();
      if (user) {
        this.clientsService.loadClients().subscribe();
      }
    });

    // Show client sidebar when a client is selected
    effect(() => {
      const client = this.selectedClient();
      this.showClientSidebar.set(client !== null);
      // Collapse agency sidebar when viewing client dashboard
      this.isAgencySidebarCollapsed.set(client !== null);
    });

    // Watch for route changes to set client context
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateClientContextFromRoute();
      });
  }

  ngOnInit(): void {
    if (!this.authService.user()) {
      this.authService.loadCurrentUser().subscribe();
    }

    // Load clients first, then check route
    this.clientsService.loadClients().subscribe({
      next: () => {
        // Wait a bit for client accounts to load
        setTimeout(() => {
          this.updateClientContextFromRoute();
        }, 100);
      },
      error: (error) => {
        console.error('Failed to load clients', error);
        // Still try to update context in case clients are already loaded
        this.updateClientContextFromRoute();
      }
    });
  }

  private updateClientContextFromRoute(): void {
    // Try to get clientId from route params first
    let clientId: string | null = null;
    
    // Check if we're in a child route with clientId param
    const childRoute = this.route.firstChild;
    if (childRoute) {
      const params = childRoute.snapshot.params;
      if (params['clientId']) {
        clientId = params['clientId'];
      }
    }
    
    // Fallback to URL parsing
    if (!clientId) {
      const url = this.router.url;
      const clientMatch = url.match(/\/agency\/client\/([^\/]+)/);
      if (clientMatch) {
        clientId = clientMatch[1];
      }
    }
    
    if (clientId) {
      const clients = this.clientsService.clients();
      
      // If clients aren't loaded yet, wait for them
      if (!clients || clients.length === 0) {
        this.clientsService.loadClients().subscribe({
          next: () => {
            setTimeout(() => this.setClientFromId(clientId!), 200);
          }
        });
        return;
      }
      
      this.setClientFromId(clientId);
    } else {
      // Not in client route, clear selection
      if (this.selectedClient()) {
        this.clientContextService.clearSelectedClient();
      }
    }
  }

  private setClientFromId(clientId: string): void {
    const clients = this.clientsService.clients();
    const client = clients.find(c => c.id === clientId);
    
    if (client) {
      // Check if client has user account, if not loaded yet, load it
      if (!this.clientContextService.hasUserAccount(clientId)) {
        // Client accounts might still be loading, try to select anyway
        // The ClientContextService will handle loading
        this.clientContextService.selectClient(client);
      } else {
        this.clientContextService.selectClient(client);
      }
    } else {
      console.warn(`Client with ID ${clientId} not found`);
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

  selectClient(client: any): void {
    this.clientContextService.selectClient(client);
    // Navigate to client dashboard home
    this.router.navigate(['/agency/client', client.id, 'dashboard']);
  }

  clearClientSelection(): void {
    this.clientContextService.clearSelectedClient();
    this.router.navigate(['/agency']);
  }

  getClientDisplayName(): string {
    const client = this.selectedClient();
    return client?.name || '';
  }

  getClientEmail(): string {
    const user = this.clientUser();
    return user?.email || '';
  }
}

