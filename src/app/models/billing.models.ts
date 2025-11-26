export interface BillingPlan {
  id: string;
  planId: string; // Basic, Pro, Enterprise, Agency
  name: string;
  description?: string;
  subscriptionType: 'User' | 'Agency';
  monthlyPrice: number;
  annualPrice?: number;
  setupFee?: number;
  accountLimit?: number;
  postLimit?: number;
  userLimit?: number;
  hasAdvancedAnalytics: boolean;
  hasPrioritySupport: boolean;
  hasCustomBranding: boolean;
  features?: string[];
  isActive: boolean;
}

export interface Subscription {
  id: string;
  tenantId: string;
  userId: string;
  subscriptionType: 'User' | 'Agency';
  planId: string;
  status: 'Trial' | 'Active' | 'Cancelled' | 'Expired' | 'PastDue';
  trialStartDate?: Date;
  trialEndDate?: Date;
  trialCancelled: boolean;
  daysRemainingInTrial?: number;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: Date;
  monthlyPrice: number;
  accountLimit?: number;
  currentAccountCount?: number;
  hasPaymentMethod: boolean;
  createdAt: Date;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  tax?: number;
  totalAmount: number;
  currency: string;
  status: 'Draft' | 'Open' | 'Paid' | 'Void' | 'Uncollectible';
  dueDate?: Date;
  paidAt?: Date;
  description?: string;
  createdAt: Date;
}

export interface PaymentMethod {
  id: string;
  type: string; // card, bank_account, etc.
  last4?: string;
  brand?: string; // visa, mastercard, etc.
  expMonth?: number;
  expYear?: number;
  country?: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
}

export interface CreateSubscriptionRequest {
  tenantId: string;
  planId: string;
  subscriptionType: 'User' | 'Agency';
  billingCycle: 'monthly' | 'annual';
  accountCount?: number; // For agency plans
}

export interface CreateCheckoutSessionRequest {
  planId: string;
  subscriptionType: 'User' | 'Agency';
  billingCycle: 'monthly' | 'annual';
  successUrl: string;
  cancelUrl: string;
  accountCount?: number; // For agency plans
}

export interface CheckoutSessionResponse {
  sessionId: string;
  url: string;
}

export interface CancelSubscriptionRequest {
  subscriptionId: string;
  cancelImmediately?: boolean;
  reason?: string;
}

