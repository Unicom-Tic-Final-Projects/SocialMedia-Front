import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ClientsService } from '../../services/client/clients.service';
import { Client } from '../../models/client.models';

@Component({
  selector: 'app-clients-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './clients-page.html',
  styleUrl: './clients-page.css',
})
export class ClientsPage implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly clientsService = inject(ClientsService);

  readonly clients = this.clientsService.clients;
  readonly selectedClientId = this.clientsService.selectedClientId;
  readonly loading = this.clientsService.loading;
  readonly error = this.clientsService.error;

  successMessage = signal<string | null>(null);

  clientForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
    description: [''],
  });

  private loadSubscription: Subscription | null = null;

  ngOnInit(): void {
    this.loadSubscription = this.clientsService.loadClients().subscribe({
      error: (error) => console.error('Failed to load clients', error),
    });
  }

  ngOnDestroy(): void {
    this.loadSubscription?.unsubscribe();
  }

  trackClientById(_: number, client: Client): string {
    return client.id;
  }

  saveClient(): void {
    if (this.clientForm.invalid) {
      this.clientForm.markAllAsTouched();
      return;
    }

    const { name, description } = this.clientForm.value;
    this.clientsService.createClient({
      name: name!.trim(),
      description: description?.trim() || undefined,
    }).subscribe({
      next: () => {
        this.successMessage.set('Client created successfully');
        this.clientForm.reset();
        setTimeout(() => this.successMessage.set(null), 3000);
      },
      error: (error) => {
        console.error('Failed to create client', error);
      },
    });
  }

  editClient(client: Client): void {
    const newName = prompt('Update client name', client.name)?.trim();
    if (!newName || newName === client.name) {
      return;
    }

    this.clientsService.updateClient(client.id, {
      name: newName,
      description: client.description,
      industry: client.industry,
      website: client.website,
      primaryContactName: client.primaryContactName,
      primaryContactEmail: client.primaryContactEmail,
      status: client.status,
    }).subscribe({
      next: () => {
        this.successMessage.set('Client updated successfully');
        setTimeout(() => this.successMessage.set(null), 3000);
      },
      error: (error) => console.error('Failed to update client', error),
    });
  }

  deleteClient(client: Client): void {
    if (!confirm(`Delete client "${client.name}"? This will remove access to their posts.`)) {
      return;
    }

    this.clientsService.deleteClient(client.id).subscribe({
      next: () => {
        this.successMessage.set('Client deleted successfully');
        setTimeout(() => this.successMessage.set(null), 3000);
      },
      error: (error) => console.error('Failed to delete client', error),
    });
  }

  setActiveClient(clientId: string): void {
    this.clientsService.setSelectedClient(clientId);
  }
}

