import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { ClientsService } from '../../services/client/clients.service';
import { ClientUserService } from '../../services/client/client-user.service';
import { ClientContextService } from '../../services/client/client-context.service';
import { AuthService } from '../../core/services/auth.service';
import { Client, CreateClientRequest, UpdateClientRequest } from '../../models/client.models';
import { CreateClientUserRequest } from '../../models/client-user.models';
import { forkJoin, Subscription, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Component({
  selector: 'app-agency-clients-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './clients-page.html',
  styleUrl: './clients-page.css',
})
export class AgencyClientsPage implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly clientsService = inject(ClientsService);
  private readonly clientUserService = inject(ClientUserService);
  private readonly clientContextService = inject(ClientContextService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly clients = this.clientsService.clients;
  readonly loading = this.clientsService.loading;
  readonly error = this.clientsService.error;
  
  // Track which clients have user accounts
  private readonly clientUserAccounts = signal<Map<string, boolean>>(new Map());

  showModal = signal(false);
  showClientUserModal = signal(false);
  selectedClientForUser = signal<Client | null>(null);
  isEditing = signal(false);
  editingClient = signal<Client | null>(null);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);
  generatedPassword = signal<string | null>(null);

  clientForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
    description: ['', [Validators.maxLength(1000)]],
    industry: ['', [Validators.maxLength(100)]],
    website: ['', [this.urlValidator.bind(this), Validators.maxLength(200)]],
    primaryContactName: ['', [Validators.maxLength(100)]],
    primaryContactEmail: ['', [Validators.email, Validators.maxLength(255)]],
  });

  clientUserForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: [''], // Optional - will be auto-generated if not provided
  });

  private loadSubscription: Subscription | null = null;

  ngOnInit(): void {
    this.loadSubscription = this.clientsService.loadClients().subscribe({
      next: () => {
        // Check which clients have user accounts
        this.checkClientUserAccounts();
      },
      error: (error) => {
        console.error('Failed to load clients', error);
        this.errorMessage.set('Failed to load clients. Please try again.');
        setTimeout(() => this.errorMessage.set(null), 5000);
      },
    });
  }

  checkClientUserAccounts(): void {
    const clients = this.clients();
    if (!clients || clients.length === 0) {
      return;
    }

    // Check each client for user account
    const checks = clients.map(client => 
      this.clientUserService.getClientUser(client.id).pipe(
        map(() => ({ clientId: client.id, hasAccount: true })),
        catchError(() => of({ clientId: client.id, hasAccount: false }))
      )
    );

    forkJoin(checks).subscribe({
      next: (results) => {
        const accountMap = new Map<string, boolean>();
        results.forEach(result => {
          accountMap.set(result.clientId, result.hasAccount);
        });
        this.clientUserAccounts.set(accountMap);
      },
      error: (error) => {
        console.error('Failed to check client user accounts', error);
      },
    });
  }

  hasUserAccount(clientId: string): boolean {
    return this.clientUserAccounts().get(clientId) ?? false;
  }

  ngOnDestroy(): void {
    this.loadSubscription?.unsubscribe();
  }

  openCreateModal(): void {
    this.isEditing.set(false);
    this.editingClient.set(null);
    this.clientForm.reset();
    this.errorMessage.set(null);
    this.showModal.set(true);
  }

  openEditModal(client: Client): void {
    this.isEditing.set(true);
    this.editingClient.set(client);
    this.errorMessage.set(null);
    this.clientForm.patchValue({
      name: client.name,
      description: client.description || '',
      industry: client.industry || '',
      website: client.website || '',
      primaryContactName: client.primaryContactName || '',
      primaryContactEmail: client.primaryContactEmail || '',
    });
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.isEditing.set(false);
    this.editingClient.set(null);
    this.clientForm.reset();
    this.errorMessage.set(null);
  }

  openCreateClientUserModal(client: Client): void {
    this.selectedClientForUser.set(client);
    this.clientUserForm.reset({
      email: client.primaryContactEmail || '',
      password: '', // Leave empty to auto-generate
    });
    this.errorMessage.set(null);
    this.generatedPassword.set(null);
    this.showClientUserModal.set(true);
  }

  closeClientUserModal(): void {
    this.showClientUserModal.set(false);
    this.selectedClientForUser.set(null);
    this.clientUserForm.reset();
    this.errorMessage.set(null);
    this.generatedPassword.set(null);
  }

  createClientUser(): void {
    if (this.clientUserForm.invalid) {
      this.clientUserForm.markAllAsTouched();
      return;
    }

    const client = this.selectedClientForUser();
    if (!client) {
      return;
    }

    const formValue = this.clientUserForm.value;
    const request: CreateClientUserRequest = {
      clientId: client.id,
      email: formValue.email!.trim(),
      password: formValue.password?.trim() || undefined, // Optional
    };

    this.clientUserService.createClientUser(request).subscribe({
      next: (response: any) => {
        // The response interceptor might unwrap ApiResponse, but client-user endpoint should return full ApiResponse
        // Check if response has message property (full ApiResponse) or if it's unwrapped
        let message = '';
        if (response?.message) {
          // Full ApiResponse structure
          message = response.message;
        } else if (typeof response === 'string') {
          // Response might be a string message
          message = response;
        }
        
        // Extract password from response message if available
        const passwordMatch = message.match(/Password: (.+)/);
        if (passwordMatch) {
          this.generatedPassword.set(passwordMatch[1]);
        }
        
        this.successMessage.set('Client user account created successfully!');
        
        // Update client user account status
        if (client) {
          const accountMap = new Map(this.clientUserAccounts());
          accountMap.set(client.id, true);
          this.clientUserAccounts.set(accountMap);
          
          // Refresh client context service to update the sidebar
          // The service will reload when clients change
          this.clientsService.loadClients().subscribe();
        }
        
        // Don't close modal if password was generated - show it in the modal
        if (!passwordMatch) {
          this.closeClientUserModal();
        }
        setTimeout(() => {
          if (!this.generatedPassword()) {
            this.successMessage.set(null);
          }
        }, 10000); // Show for 10 seconds to allow copying password
      },
      error: (error) => {
        console.error('Failed to create client user', error);
        const errorMsg = error?.userMessage || 
                        error?.error?.message || 
                        error?.error?.errors?.[0] || 
                        error?.message || 
                        'Failed to create client user account. Please try again.';
        this.errorMessage.set(errorMsg);
        setTimeout(() => this.errorMessage.set(null), 5000);
      },
    });
  }

  saveClient(): void {
    if (this.clientForm.invalid) {
      this.clientForm.markAllAsTouched();
      return;
    }

    const formValue = this.clientForm.value;
    const request: CreateClientRequest | UpdateClientRequest = {
      name: formValue.name!.trim(),
      description: formValue.description?.trim() || undefined,
      industry: formValue.industry?.trim() || undefined,
      website: formValue.website?.trim() || undefined,
      primaryContactName: formValue.primaryContactName?.trim() || undefined,
      primaryContactEmail: formValue.primaryContactEmail?.trim() || undefined,
    };

    if (this.isEditing() && this.editingClient()) {
      // Update existing client
      const updateRequest: UpdateClientRequest = {
        ...request,
        status: this.editingClient()!.status,
      };
      this.clientsService.updateClient(this.editingClient()!.id, updateRequest).subscribe({
        next: () => {
          this.successMessage.set('Client updated successfully');
          this.closeModal();
          setTimeout(() => this.successMessage.set(null), 3000);
        },
        error: (error) => {
          console.error('Failed to update client', error);
          this.errorMessage.set(error?.message || 'Failed to update client. Please try again.');
        },
      });
    } else {
      // Create new client
      this.clientsService.createClient(request).subscribe({
        next: () => {
          this.successMessage.set('Client created successfully');
          this.closeModal();
          setTimeout(() => this.successMessage.set(null), 3000);
        },
        error: (error) => {
          console.error('Failed to create client', error);
          this.errorMessage.set(error?.message || 'Failed to create client. Please try again.');
        },
      });
    }
  }

  deleteClient(client: Client): void {
    if (!confirm(`Are you sure you want to delete "${client.name}"? This action cannot be undone.`)) {
      return;
    }

    this.clientsService.deleteClient(client.id).subscribe({
      next: () => {
        this.successMessage.set('Client deleted successfully');
        setTimeout(() => this.successMessage.set(null), 3000);
      },
      error: (error) => {
        console.error('Failed to delete client', error);
        this.errorMessage.set(error?.message || 'Failed to delete client. Please try again.');
        setTimeout(() => this.errorMessage.set(null), 5000);
      },
    });
  }

  trackClientById(_: number, client: Client): string {
    return client.id;
  }

  copyPasswordToClipboard(): void {
    const password = this.generatedPassword();
    if (password) {
      navigator.clipboard.writeText(password).then(() => {
        this.successMessage.set('Password copied to clipboard!');
        setTimeout(() => this.successMessage.set(null), 3000);
      }).catch((err) => {
        console.error('Failed to copy password', err);
        this.errorMessage.set('Failed to copy password to clipboard');
        setTimeout(() => this.errorMessage.set(null), 3000);
      });
    }
  }

  accessClientDashboard(client: Client): void {
    // Select client to show their dashboard in the sub-sidebar
    this.clientContextService.selectClient(client);
    // Navigate to client dashboard
    this.router.navigate(['/agency/client', client.id, 'dashboard']);
  }

  private urlValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value || control.value.trim() === '') {
      return null; // Empty is valid (optional field)
    }
    try {
      new URL(control.value);
      return null; // Valid URL
    } catch {
      return { invalidUrl: true }; // Invalid URL
    }
  }
}

