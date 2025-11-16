import { Injectable, inject, signal, effect, computed } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ClientUserService } from './client-user.service';
import { ClientsService } from './clients.service';
import { Client } from '../../models/client.models';
import { ClientUser } from '../../models/client-user.models';
import { forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

/**
 * Service to manage client context for viewing individual client dashboards
 * within the agency dashboard
 */
@Injectable({
  providedIn: 'root',
})
export class ClientContextService {
  private readonly clientUserService = inject(ClientUserService);
  private readonly clientsService = inject(ClientsService);
  private readonly router = inject(Router);

  // Currently selected client for viewing their dashboard
  private readonly selectedClientSignal = signal<Client | null>(null);
  readonly selectedClient = this.selectedClientSignal.asReadonly();

  // Client user account info for the selected client
  private readonly clientUserSignal = signal<ClientUser | null>(null);
  readonly clientUser = this.clientUserSignal.asReadonly();

  // Map of client IDs to their user account info
  private readonly clientUserAccountsSignal = signal<Map<string, ClientUser>>(new Map());
  readonly clientUserAccounts = this.clientUserAccountsSignal.asReadonly();

  // Clients that have user accounts
  readonly clientsWithAccounts = signal<Client[]>([]);

  // Check if currently viewing a client dashboard (in agency context)
  readonly isViewingClientDashboard = computed(() => {
    return this.selectedClientSignal() !== null;
  });

  constructor() {
    // Load clients with accounts when clients are loaded
    effect(() => {
      const clients = this.clientsService.clients();
      if (clients && clients.length > 0) {
        this.loadClientUserAccounts(clients);
      }
    });
  }

  /**
   * Load user accounts for all clients
   */
  loadClientUserAccounts(clients: Client[]): void {
    const checks = clients.map(client =>
      this.clientUserService.getClientUser(client.id).pipe(
        map((user) => ({ client, user, hasAccount: true })),
        catchError(() => of({ client, user: null, hasAccount: false }))
      )
    );

    forkJoin(checks).subscribe({
      next: (results) => {
        const accountMap = new Map<string, ClientUser>();
        const clientsWithAccounts: Client[] = [];

        results.forEach(result => {
          if (result.hasAccount && result.user) {
            accountMap.set(result.client.id, result.user);
            clientsWithAccounts.push(result.client);
          }
        });

        this.clientUserAccountsSignal.set(accountMap);
        this.clientsWithAccounts.set(clientsWithAccounts);
      },
      error: (error) => {
        console.error('Failed to load client user accounts', error);
      },
    });
  }

  /**
   * Select a client to view their dashboard
   */
  selectClient(client: Client | null): void {
    this.selectedClientSignal.set(client);
    
    if (client) {
      const userAccount = this.clientUserAccountsSignal().get(client.id);
      this.clientUserSignal.set(userAccount || null);
    } else {
      this.clientUserSignal.set(null);
    }
  }

  /**
   * Check if a client has a user account
   */
  hasUserAccount(clientId: string): boolean {
    return this.clientUserAccountsSignal().has(clientId);
  }

  /**
   * Get user account for a client
   */
  getUserAccount(clientId: string): ClientUser | undefined {
    return this.clientUserAccountsSignal().get(clientId);
  }

  /**
   * Clear selected client (return to agency view)
   */
  clearSelectedClient(): void {
    this.selectedClientSignal.set(null);
    this.clientUserSignal.set(null);
  }


  /**
   * Get current client ID from route or selected client
   */
  getCurrentClientId(): string | null {
    const url = this.router.url;
    const clientMatch = url.match(/\/agency\/client\/([^\/]+)/);
    if (clientMatch) {
      return clientMatch[1];
    }
    return this.selectedClientSignal()?.id || null;
  }

  /**
   * Get current client user ID (for API calls)
   */
  getCurrentClientUserId(): string | null {
    const client = this.selectedClientSignal();
    if (!client) {
      return null;
    }
    const userAccount = this.clientUserAccountsSignal().get(client.id);
    return userAccount?.userId || null;
  }

  /**
   * Initialize client from route (called by components)
   */
  initializeFromRoute(clientId: string): Promise<void> {
    return new Promise((resolve) => {
      // If client is already selected and matches, return
      const currentClient = this.selectedClientSignal();
      if (currentClient && currentClient.id === clientId) {
        resolve();
        return;
      }

      // Load clients if not loaded
      const clients = this.clientsService.clients();
      if (!clients || clients.length === 0) {
        this.clientsService.loadClients().subscribe({
          next: () => {
            // Wait a bit for client accounts to load
            setTimeout(() => {
              const updatedClients = this.clientsService.clients();
              const client = updatedClients.find(c => c.id === clientId);
              if (client) {
                this.selectClient(client);
              }
              resolve();
            }, 200);
          },
          error: () => {
            resolve(); // Resolve anyway to not block component loading
          }
        });
      } else {
        // Find and select client
        const client = clients.find(c => c.id === clientId);
        if (client) {
          this.selectClient(client);
        }
        resolve();
      }
    });
  }
}

