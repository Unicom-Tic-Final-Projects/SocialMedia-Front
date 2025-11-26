import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BillingService } from '../../services/client/billing.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ClientsService } from '../../services/client/clients.service';
import { BillingPlan, Subscription, Invoice, PaymentMethod } from '../../models/billing.models';

@Component({
  selector: 'app-agency-billing-page',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './billing-page.html',
  styleUrl: './billing-page.css',
})
export class AgencyBillingPage implements OnInit {
  private readonly billingService = inject(BillingService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly clientsService = inject(ClientsService);

  readonly plans = this.billingService.plans;
  readonly subscription = this.billingService.subscription;
  readonly invoices = this.billingService.invoices;
  readonly paymentMethods = this.billingService.paymentMethods;
  readonly clients = this.clientsService.clients;
  readonly loading = this.billingService.loading;
  readonly error = this.billingService.error;

  showUpgradeModal = signal(false);
  showCancelModal = signal(false);
  showAccountCountModal = signal(false);
  selectedPlan = signal<BillingPlan | null>(null);
  billingCycle = signal<'monthly' | 'annual'>('monthly');
  newAccountCount = signal<number>(0);

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    const user = this.authService.user();
    if (!user?.tenantId) {
      this.toastService.error('Tenant ID not found');
      return;
    }

    // Load agency plans
    this.billingService.getPlans('Agency').subscribe({
      error: (err) => this.toastService.error(err.message || 'Failed to load plans'),
    });

    // Load subscription
    this.billingService.getSubscription(user.tenantId).subscribe({
      error: (err) => {
        if (err.status !== 404) {
          this.toastService.error(err.message || 'Failed to load subscription');
        }
      },
    });

    // Load invoices
    this.billingService.getInvoices(user.tenantId).subscribe({
      error: (err) => this.toastService.error(err.message || 'Failed to load invoices'),
    });

    // Load payment methods
    this.billingService.getPaymentMethods(user.tenantId).subscribe({
      error: (err) => {
        if (err.status !== 404) {
          this.toastService.error(err.message || 'Failed to load payment methods');
        }
      },
    });

    // Load clients to get current account count
    this.clientsService.loadClients().subscribe({
      next: () => {
        const currentCount = this.clients().length;
        this.newAccountCount.set(currentCount);
      },
      error: (err) => this.toastService.error(err.message || 'Failed to load clients'),
    });
  }

  openUpgradeModal(plan: BillingPlan): void {
    this.selectedPlan.set(plan);
    this.showUpgradeModal.set(true);
  }

  closeUpgradeModal(): void {
    this.showUpgradeModal.set(false);
    this.selectedPlan.set(null);
  }

  openCancelModal(): void {
    this.showCancelModal.set(true);
  }

  closeCancelModal(): void {
    this.showCancelModal.set(false);
  }

  openAccountCountModal(): void {
    const currentCount = this.clients().length;
    this.newAccountCount.set(currentCount);
    this.showAccountCountModal.set(true);
  }

  closeAccountCountModal(): void {
    this.showAccountCountModal.set(false);
  }

  upgradePlan(): void {
    const plan = this.selectedPlan();
    const user = this.authService.user();
    if (!plan || !user?.tenantId) {
      return;
    }

    const successUrl = `${window.location.origin}/agency/billing?success=true`;
    const cancelUrl = `${window.location.origin}/agency/billing?canceled=true`;

    this.billingService
      .createCheckoutSession({
        planId: plan.planId,
        subscriptionType: plan.subscriptionType,
        billingCycle: this.billingCycle(),
        successUrl,
        cancelUrl,
        accountCount: this.newAccountCount(),
      })
      .subscribe({
        next: (checkoutResponse) => {
          if (checkoutResponse?.url) {
            window.location.href = checkoutResponse.url;
          }
        },
        error: (error) => {
          this.toastService.error(error.message || 'Failed to create checkout session');
        },
      });
  }

  cancelSubscription(): void {
    const subscription = this.subscription();
    if (!subscription) {
      return;
    }

    if (confirm('Are you sure you want to cancel your subscription? It will remain active until the end of the current billing period.')) {
      this.billingService
        .cancelSubscription({
          subscriptionId: subscription.id,
          cancelImmediately: false,
        })
        .subscribe({
          next: (success) => {
            if (success) {
              this.toastService.success('Subscription will be cancelled at the end of the billing period');
              this.closeCancelModal();
              this.loadData();
            } else {
              this.toastService.error('Failed to cancel subscription');
            }
          },
          error: (err) => this.toastService.error(err.message || 'Failed to cancel subscription'),
        });
    }
  }

  updateAccountCount(): void {
    const subscription = this.subscription();
    if (!subscription) {
      return;
    }

    this.billingService.updateAgencyAccountCount(subscription.id, this.newAccountCount()).subscribe({
      next: (success) => {
        if (success) {
          this.toastService.success('Account count updated successfully');
          this.closeAccountCountModal();
          this.loadData();
        } else {
          this.toastService.error('Failed to update account count');
        }
      },
      error: (err) => this.toastService.error(err.message || 'Failed to update account count'),
    });
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Trial':
        return 'bg-blue-100 text-blue-800';
      case 'Cancelled':
        return 'bg-gray-100 text-gray-800';
      case 'PastDue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getInvoiceStatusColor(status: string): string {
    switch (status) {
      case 'Paid':
        return 'bg-green-100 text-green-800';
      case 'Open':
        return 'bg-yellow-100 text-yellow-800';
      case 'Void':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  }

  getCurrentPlan(): BillingPlan | null {
    const subscription = this.subscription();
    if (!subscription) return null;

    return this.plans().find((p) => p.planId === subscription.planId) || null;
  }

  isCurrentPlan(plan: BillingPlan): boolean {
    const subscription = this.subscription();
    return subscription?.planId === plan.planId;
  }

  calculateMonthlyTotal(): number {
    const subscription = this.subscription();
    if (!subscription) return 0;

    const plan = this.getCurrentPlan();
    if (!plan) return subscription.monthlyPrice;

    const accountCount = subscription.currentAccountCount || 0;
    return plan.monthlyPrice * accountCount;
  }
}

