import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, tap, catchError, throwError } from 'rxjs';
import { API_BASE_URL } from '../../config/api.config';
import { 
  WebhookSubscription, 
  CreateWebhookSubscriptionRequest, 
  WebhookEvent 
} from '../../models/webhook.models';

@Injectable({
  providedIn: 'root'
})
export class WebhooksService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  private readonly subscriptionsSignal = signal<WebhookSubscription[]>([]);
  readonly subscriptions = this.subscriptionsSignal.asReadonly();

  private readonly loadingSignal = signal(false);
  readonly loading = this.loadingSignal.asReadonly();

  private readonly errorSignal = signal<string | null>(null);
  readonly error = this.errorSignal.asReadonly();

  /**
   * Get all webhook subscriptions for the current tenant
   */
  getSubscriptions(platform?: string): Observable<WebhookSubscription[]> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    let params = new HttpParams();
    if (platform) {
      params = params.set('platform', platform);
    }

    return this.http.get<any>(`${this.baseUrl}/api/webhooksubscriptions`, { params }).pipe(
      map((response) => {
        // Handle ApiResponse structure
        if (response?.success !== undefined) {
          const subscriptions = response?.data || [];
          return Array.isArray(subscriptions) ? subscriptions : [];
        }
        // Handle direct array response
        const subscriptions = Array.isArray(response) ? response : (response?.data || []);
        return Array.isArray(subscriptions) ? subscriptions : [];
      }),
      tap((subscriptions) => {
        this.subscriptionsSignal.set(subscriptions);
        this.loadingSignal.set(false);
      }),
      catchError((error) => {
        this.errorSignal.set(error.error?.message || 'Failed to load webhook subscriptions');
        this.loadingSignal.set(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get webhook subscription by ID
   */
  getSubscriptionById(id: string): Observable<WebhookSubscription> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.get<any>(`${this.baseUrl}/api/webhooksubscriptions/${id}`).pipe(
      map((response) => {
        // Handle ApiResponse structure
        if (response?.success !== undefined) {
          return response?.data || response;
        }
        return response;
      }),
      tap(() => this.loadingSignal.set(false)),
      catchError((error) => {
        this.errorSignal.set(error.error?.message || 'Failed to load webhook subscription');
        this.loadingSignal.set(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Create a new webhook subscription
   */
  createSubscription(request: CreateWebhookSubscriptionRequest): Observable<WebhookSubscription> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.post<any>(`${this.baseUrl}/api/webhooksubscriptions`, request).pipe(
      map((response) => {
        // Handle ApiResponse structure
        if (response?.success !== undefined) {
          return response?.data || response;
        }
        return response;
      }),
      tap((subscription) => {
        // Add to local state
        const current = this.subscriptionsSignal();
        this.subscriptionsSignal.set([...current, subscription]);
        this.loadingSignal.set(false);
      }),
      catchError((error) => {
        this.errorSignal.set(error.error?.message || 'Failed to create webhook subscription');
        this.loadingSignal.set(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Delete webhook subscription
   */
  deleteSubscription(id: string): Observable<void> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.delete<any>(`${this.baseUrl}/api/webhooksubscriptions/${id}`).pipe(
      tap(() => {
        // Remove from local state
        const current = this.subscriptionsSignal();
        this.subscriptionsSignal.set(current.filter(s => s.id !== id));
        this.loadingSignal.set(false);
      }),
      catchError((error) => {
        this.errorSignal.set(error.error?.message || 'Failed to delete webhook subscription');
        this.loadingSignal.set(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get webhook events
   */
  getWebhookEvents(platform?: string, status?: string, pageNumber: number = 1, pageSize: number = 20): Observable<WebhookEvent[]> {
    let params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());
    
    if (platform) {
      params = params.set('platform', platform);
    }
    if (status) {
      params = params.set('status', status);
    }

    return this.http.get<any>(`${this.baseUrl}/api/webhooks/events`, { params }).pipe(
      map((response) => {
        // Handle ApiResponse structure
        if (response?.success !== undefined) {
          const events = response?.data || [];
          return Array.isArray(events) ? events : [];
        }
        // Handle direct array response
        const events = Array.isArray(response) ? response : (response?.data || []);
        return Array.isArray(events) ? events : [];
      }),
      catchError((error) => {
        this.errorSignal.set(error.error?.message || 'Failed to load webhook events');
        return throwError(() => error);
      })
    );
  }
}

