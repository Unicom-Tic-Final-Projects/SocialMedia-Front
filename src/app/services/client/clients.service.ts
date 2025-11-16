import { Injectable, effect, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, tap, throwError } from 'rxjs';
import { API_BASE_URL } from '../../config/api.config';
import { Client, CreateClientRequest, UpdateClientRequest } from '../../models/client.models';
import { AuthService } from '../../core/services/auth.service';

const SELECTED_CLIENT_STORAGE_KEY = 'np_selected_client_id';

@Injectable({
  providedIn: 'root',
})
export class ClientsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly authService = inject(AuthService);

  private readonly clientsSignal = signal<Client[]>([]);
  readonly clients = this.clientsSignal.asReadonly();

  private readonly loadingSignal = signal(false);
  readonly loading = this.loadingSignal.asReadonly();

  private readonly errorSignal = signal<string | null>(null);
  readonly error = this.errorSignal.asReadonly();

  private readonly selectedClientIdSignal = signal<string | null>(this.getStoredSelectedClientId());
  readonly selectedClientId = this.selectedClientIdSignal.asReadonly();

  private hasRequestedInitialLoad = false;

  constructor() {
    // Ensure selected client remains valid if list changes
    effect(() => {
      const clients = this.clientsSignal();
      const selectedClientId = this.selectedClientIdSignal();

      if (!clients.length) {
        return;
      }

      if (!selectedClientId || !clients.some((client) => client.id === selectedClientId)) {
        const fallbackClient = clients[0];
        this.setSelectedClient(fallbackClient.id);
      }
    });

    // Auto load clients when user becomes available
    effect(() => {
      const user = this.authService.user();
      if (user && !this.hasRequestedInitialLoad) {
        this.hasRequestedInitialLoad = true;
        this.loadClients().subscribe({
          error: (error) => console.error('Failed to preload clients', error),
        });
      }
    });
  }

  /**
   * Load clients for the current tenant
   */
  loadClients() {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.get<Client[]>(`${this.baseUrl}/api/clients`).pipe(
      tap((clients) => {
        this.clientsSignal.set(clients);
        this.loadingSignal.set(false);
      }),
      catchError((error) => {
        this.errorSignal.set(error?.userMessage || 'Failed to load clients');
        this.loadingSignal.set(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Create a new client
   */
  createClient(request: CreateClientRequest) {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.post<Client>(`${this.baseUrl}/api/clients`, request).pipe(
      tap((client) => {
        this.clientsSignal.update((clients) => [client, ...clients].sort((a, b) => a.name.localeCompare(b.name)));
        this.setSelectedClient(client.id);
        this.loadingSignal.set(false);
      }),
      catchError((error) => {
        this.errorSignal.set(error?.userMessage || 'Failed to create client');
        this.loadingSignal.set(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Update existing client
   */
  updateClient(clientId: string, request: UpdateClientRequest) {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.put<Client>(`${this.baseUrl}/api/clients/${clientId}`, request).pipe(
      tap((updatedClient) => {
        this.clientsSignal.update((clients) =>
          clients
            .map((client) => (client.id === clientId ? updatedClient : client))
            .sort((a, b) => a.name.localeCompare(b.name))
        );
        this.loadingSignal.set(false);
      }),
      catchError((error) => {
        this.errorSignal.set(error?.userMessage || 'Failed to update client');
        this.loadingSignal.set(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Delete client
   */
  deleteClient(clientId: string) {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.delete<boolean>(`${this.baseUrl}/api/clients/${clientId}`).pipe(
      tap(() => {
        this.clientsSignal.update((clients) => clients.filter((client) => client.id !== clientId));
        if (this.selectedClientIdSignal() === clientId) {
          const remainingClients = this.clientsSignal();
          this.setSelectedClient(remainingClients.length ? remainingClients[0].id : null);
        }
        this.loadingSignal.set(false);
      }),
      catchError((error) => {
        this.errorSignal.set(error?.userMessage || 'Failed to delete client');
        this.loadingSignal.set(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Select client for current session
   */
  setSelectedClient(clientId: string | null) {
    this.selectedClientIdSignal.set(clientId);
    if (clientId) {
      localStorage.setItem(SELECTED_CLIENT_STORAGE_KEY, clientId);
    } else {
      localStorage.removeItem(SELECTED_CLIENT_STORAGE_KEY);
    }
  }

  getSelectedClient(): Client | undefined {
    const selectedId = this.selectedClientIdSignal();
    if (!selectedId) {
      return undefined;
    }
    
    const clients = this.clientsSignal();
    // Ensure clients is an array before calling find
    if (!Array.isArray(clients)) {
      console.warn('ClientsService: clientsSignal is not an array:', clients);
      return undefined;
    }
    
    return clients.find((client) => client.id === selectedId);
  }

  private getStoredSelectedClientId(): string | null {
    try {
      return localStorage.getItem(SELECTED_CLIENT_STORAGE_KEY);
    } catch (error) {
      console.warn('Unable to access localStorage for selected client', error);
      return null;
    }
  }
}

