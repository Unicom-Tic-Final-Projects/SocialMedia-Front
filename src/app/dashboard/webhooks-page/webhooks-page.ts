import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WebhooksService } from '../../services/client/webhooks.service';
import { ClientsService } from '../../services/client/clients.service';
import { SocialAccountsService } from '../../services/client/social-accounts.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { 
  WebhookSubscription, 
  CreateWebhookSubscriptionRequest 
} from '../../models/webhook.models';
import { Client } from '../../models/client.models';
import { SocialAccount } from '../../models/social.models';

@Component({
  selector: 'app-webhooks-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './webhooks-page.html',
  styleUrl: './webhooks-page.css',
})
export class WebhooksPage implements OnInit {
  private readonly webhooksService = inject(WebhooksService);
  private readonly clientsService = inject(ClientsService);
  private readonly socialAccountsService = inject(SocialAccountsService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  subscriptions = signal<WebhookSubscription[]>([]);
  loading = signal(false);
  showCreateModal = signal(false);
  showTokenModal = signal(false);
  selectedSubscription = signal<WebhookSubscription | null>(null);
  clients = signal<Client[]>([]);
  socialAccounts = signal<SocialAccount[]>([]);

  // Form data
  formData: CreateWebhookSubscriptionRequest = {
    tenantId: '',
    platform: 'WordPress',
    callbackUrl: '',
    configuration: {
      defaultClientId: undefined,
      defaultUserId: undefined,
      defaultSocialAccountIds: []
    }
  };

  platforms = [
    { value: 'WordPress', label: 'WordPress' },
    { value: 'Shopify', label: 'Shopify' },
    { value: 'WooCommerce', label: 'WooCommerce' },
    { value: 'Custom', label: 'Custom Website' }
  ];

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    
    const user = this.authService.user();
    if (!user?.tenantId) {
      this.toastService.error('Tenant information not found');
      this.loading.set(false);
      return;
    }

    this.formData.tenantId = user.tenantId;

    // Load subscriptions
    this.webhooksService.getSubscriptions().subscribe({
      next: (subscriptions) => {
        this.subscriptions.set(subscriptions);
        this.loading.set(false);
      },
      error: (error) => {
        this.toastService.error('Failed to load webhook subscriptions');
        this.loading.set(false);
      }
    });

    // Load clients (for agency accounts)
    this.clientsService.loadClients().subscribe({
      next: (clients) => {
        // Extract data from response if needed
        const clientsData = Array.isArray(clients) ? clients : (clients as any)?.data || [];
        this.clients.set(clientsData);
      },
      error: () => {
        // Ignore errors for clients - use signal value if available
        const existingClients = this.clientsService.clients();
        if (existingClients.length > 0) {
          this.clients.set(existingClients);
        }
      }
    });

    // Load social accounts
    this.socialAccountsService.getSocialAccounts().subscribe({
      next: (accounts) => {
        this.socialAccounts.set(accounts);
      },
      error: () => {
        // Ignore errors for social accounts
      }
    });
  }

  openCreateModal(): void {
    const user = this.authService.user();
    if (user?.userId) {
      this.formData.configuration!.defaultUserId = user.userId;
    }
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
    this.formData = {
      tenantId: this.formData.tenantId,
      platform: 'WordPress',
      callbackUrl: '',
      configuration: {
        defaultClientId: undefined,
        defaultUserId: this.formData.configuration?.defaultUserId,
        defaultSocialAccountIds: []
      }
    };
  }

  createSubscription(): void {
    if (!this.formData.callbackUrl) {
      this.toastService.error('Callback URL is required');
      return;
    }

    // Build configuration object
    const config: Record<string, any> = {};
    if (this.formData.configuration?.defaultClientId) {
      config['DefaultClientId'] = this.formData.configuration.defaultClientId;
    }
    if (this.formData.configuration?.defaultUserId) {
      config['DefaultUserId'] = this.formData.configuration.defaultUserId;
    }
    if (this.formData.configuration?.defaultSocialAccountIds && this.formData.configuration.defaultSocialAccountIds.length > 0) {
      config['DefaultSocialAccountIds'] = this.formData.configuration.defaultSocialAccountIds;
    }

    const request: CreateWebhookSubscriptionRequest = {
      tenantId: this.formData.tenantId,
      platform: this.formData.platform,
      callbackUrl: this.formData.callbackUrl,
      eventTypes: this.formData.eventTypes,
      configuration: Object.keys(config).length > 0 ? config : undefined
    };

    this.loading.set(true);
    this.webhooksService.createSubscription(request).subscribe({
      next: (subscription) => {
        this.toastService.success('Webhook subscription created successfully');
        this.closeCreateModal();
        this.selectedSubscription.set(subscription);
        this.showTokenModal.set(true);
        this.loadData();
      },
      error: (error) => {
        this.toastService.error(error.error?.message || 'Failed to create webhook subscription');
        this.loading.set(false);
      }
    });
  }

  showToken(subscription: WebhookSubscription): void {
    this.selectedSubscription.set(subscription);
    this.showTokenModal.set(true);
  }

  closeTokenModal(): void {
    this.showTokenModal.set(false);
    this.selectedSubscription.set(null);
  }

  copyToken(token: string): void {
    navigator.clipboard.writeText(token).then(() => {
      this.toastService.success('Webhook token copied to clipboard');
    }).catch(() => {
      this.toastService.error('Failed to copy token');
    });
  }

  getWebhookUrl(): string {
    // Get base URL from the service
    const baseUrl = (this.webhooksService as any).baseUrl();
    return `${baseUrl}/api/webhooks/content`;
  }

  copyWebhookUrl(): void {
    const url = this.getWebhookUrl();
    navigator.clipboard.writeText(url).then(() => {
      this.toastService.success('Webhook URL copied to clipboard');
    }).catch(() => {
      this.toastService.error('Failed to copy URL');
    });
  }

  deleteSubscription(subscription: WebhookSubscription): void {
    if (!confirm(`Are you sure you want to delete the webhook subscription for ${subscription.platform}?`)) {
      return;
    }

    this.loading.set(true);
    this.webhooksService.deleteSubscription(subscription.id).subscribe({
      next: () => {
        this.toastService.success('Webhook subscription deleted successfully');
        this.loadData();
      },
      error: (error) => {
        this.toastService.error(error.error?.message || 'Failed to delete webhook subscription');
        this.loading.set(false);
      }
    });
  }

  getSuccessRate(subscription: WebhookSubscription): number {
    if (subscription.totalEventsReceived === 0) {
      return 0;
    }
    return Math.round((subscription.successfulEvents / subscription.totalEventsReceived) * 100);
  }

  toggleSocialAccount(accountId: string): void {
    if (!this.formData.configuration!.defaultSocialAccountIds) {
      this.formData.configuration!.defaultSocialAccountIds = [];
    }
    const index = this.formData.configuration!.defaultSocialAccountIds.indexOf(accountId);
    if (index > -1) {
      this.formData.configuration!.defaultSocialAccountIds.splice(index, 1);
    } else {
      this.formData.configuration!.defaultSocialAccountIds.push(accountId);
    }
  }

  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'active':
      case 'processed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
}

