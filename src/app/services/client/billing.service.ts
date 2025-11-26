import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, tap, catchError, throwError } from 'rxjs';
import { API_BASE_URL } from '../../config/api.config';
import {
  BillingPlan,
  Subscription,
  Invoice,
  PaymentMethod,
  CreateSubscriptionRequest,
  CreateCheckoutSessionRequest,
  CheckoutSessionResponse,
  CancelSubscriptionRequest,
} from '../../models/billing.models';
import { ApiResponse } from '../../models/api.models';
import { AuthService } from '../../core/services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class BillingService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly authService = inject(AuthService);

  private readonly plansSignal = signal<BillingPlan[]>([]);
  readonly plans = this.plansSignal.asReadonly();

  private readonly subscriptionSignal = signal<Subscription | null>(null);
  readonly subscription = this.subscriptionSignal.asReadonly();

  private readonly invoicesSignal = signal<Invoice[]>([]);
  readonly invoices = this.invoicesSignal.asReadonly();

  private readonly paymentMethodsSignal = signal<PaymentMethod[]>([]);
  readonly paymentMethods = this.paymentMethodsSignal.asReadonly();

  private readonly loadingSignal = signal(false);
  readonly loading = this.loadingSignal.asReadonly();

  private readonly errorSignal = signal<string | null>(null);
  readonly error = this.errorSignal.asReadonly();

  getPlans(subscriptionType?: 'User' | 'Agency'): Observable<BillingPlan[]> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    let params = new HttpParams();
    if (subscriptionType) {
      params = params.set('subscriptionType', subscriptionType);
    }

    return this.http
      .get<ApiResponse<BillingPlan[]>>(`${this.baseUrl}/api/billingplans`, { params })
      .pipe(
        map((response) => {
          console.log('Billing plans API response:', response);
          // Handle both direct array response and wrapped ApiResponse
          let plans: BillingPlan[] = [];
          if (response) {
            if (Array.isArray(response)) {
              plans = response;
            } else if (response.data) {
              plans = Array.isArray(response.data) ? response.data : [];
            } else if (response.success !== undefined && response.data) {
              plans = Array.isArray(response.data) ? response.data : [];
            }
          }
          console.log('Parsed plans:', plans);
          return plans;
        }),
        tap((plans) => {
          this.plansSignal.set(plans);
          this.loadingSignal.set(false);
        }),
        catchError((error) => {
          console.error('Error loading billing plans:', error);
          this.errorSignal.set(error.error?.message || error.message || 'Failed to load billing plans');
          this.loadingSignal.set(false);
          return throwError(() => error);
        })
      );
  }

  getSubscription(tenantId: string): Observable<Subscription> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http
      .get<ApiResponse<Subscription>>(`${this.baseUrl}/api/subscriptions/tenant/${tenantId}`)
      .pipe(
        map((response) => response?.data as Subscription),
        tap((subscription) => {
          this.subscriptionSignal.set(subscription);
          this.loadingSignal.set(false);
        }),
        catchError((error) => {
          this.errorSignal.set(error.error?.message || 'Failed to load subscription');
          this.loadingSignal.set(false);
          return throwError(() => error);
        })
      );
  }

  createSubscription(request: CreateSubscriptionRequest): Observable<Subscription> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http
      .post<ApiResponse<Subscription>>(`${this.baseUrl}/api/subscriptions`, request)
      .pipe(
        map((response) => response?.data as Subscription),
        tap((subscription) => {
          this.subscriptionSignal.set(subscription);
          this.loadingSignal.set(false);
        }),
        catchError((error) => {
          this.errorSignal.set(error.error?.message || 'Failed to create subscription');
          this.loadingSignal.set(false);
          return throwError(() => error);
        })
      );
  }

  createCheckoutSession(request: CreateCheckoutSessionRequest): Observable<CheckoutSessionResponse> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http
      .post<ApiResponse<CheckoutSessionResponse>>(`${this.baseUrl}/api/subscriptions/checkout`, request)
      .pipe(
        map((response) => response?.data as CheckoutSessionResponse),
        tap(() => this.loadingSignal.set(false)),
        catchError((error) => {
          this.errorSignal.set(error.error?.message || 'Failed to create checkout session');
          this.loadingSignal.set(false);
          return throwError(() => error);
        })
      );
  }

  cancelSubscription(request: CancelSubscriptionRequest): Observable<boolean> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http
      .post<ApiResponse<boolean>>(`${this.baseUrl}/api/subscriptions/${request.subscriptionId}/cancel`, request)
      .pipe(
        map((response) => response?.data as boolean),
        tap((success) => {
          if (success) {
            // Refresh subscription
            const tenantId = this.authService.user()?.tenantId;
            if (tenantId) {
              this.getSubscription(tenantId).subscribe();
            }
          }
          this.loadingSignal.set(false);
        }),
        catchError((error) => {
          this.errorSignal.set(error.error?.message || 'Failed to cancel subscription');
          this.loadingSignal.set(false);
          return throwError(() => error);
        })
      );
  }

  getInvoices(tenantId: string): Observable<Invoice[]> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http
      .get<ApiResponse<Invoice[]>>(`${this.baseUrl}/api/invoices`, {
        params: new HttpParams().set('tenantId', tenantId),
      })
      .pipe(
        map((response) => {
          const invoices = response?.data || [];
          return Array.isArray(invoices) ? invoices : [];
        }),
        tap((invoices) => {
          this.invoicesSignal.set(invoices);
          this.loadingSignal.set(false);
        }),
        catchError((error) => {
          this.errorSignal.set(error.error?.message || 'Failed to load invoices');
          this.loadingSignal.set(false);
          return throwError(() => error);
        })
      );
  }

  getPaymentMethods(tenantId: string): Observable<PaymentMethod[]> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http
      .get<ApiResponse<PaymentMethod[]>>(`${this.baseUrl}/api/paymentmethods`, {
        params: new HttpParams().set('tenantId', tenantId),
      })
      .pipe(
        map((response) => {
          const methods = response?.data || [];
          return Array.isArray(methods) ? methods : [];
        }),
        tap((methods) => {
          this.paymentMethodsSignal.set(methods);
          this.loadingSignal.set(false);
        }),
        catchError((error) => {
          this.errorSignal.set(error.error?.message || 'Failed to load payment methods');
          this.loadingSignal.set(false);
          return throwError(() => error);
        })
      );
  }

  updateAgencyAccountCount(subscriptionId: string, accountCount: number): Observable<boolean> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http
      .put<ApiResponse<boolean>>(`${this.baseUrl}/api/subscriptions/${subscriptionId}/account-count`, accountCount)
      .pipe(
        map((response) => response?.data as boolean),
        tap((success) => {
          if (success) {
            // Refresh subscription
            const tenantId = this.authService.user()?.tenantId;
            if (tenantId) {
              this.getSubscription(tenantId).subscribe();
            }
          }
          this.loadingSignal.set(false);
        }),
        catchError((error) => {
          this.errorSignal.set(error.error?.message || 'Failed to update account count');
          this.loadingSignal.set(false);
          return throwError(() => error);
        })
      );
  }
}

