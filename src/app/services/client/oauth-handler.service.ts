import { Injectable, inject } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { Router, ActivatedRoute } from '@angular/router';
import { SocialAccountsService } from './social-accounts.service';
import { ToastService } from '../../core/services/toast.service';
import { LoggingService } from '../../core/services/logging.service';
import { Platform } from '../../models/social.models';

export interface OAuthSuccessEvent {
  type: 'OAUTH_SUCCESS';
  platform: Platform;
  accountId?: string;
}

export interface OAuthErrorEvent {
  type: 'OAUTH_ERROR';
  error: string;
  platform?: Platform;
}

@Injectable({
  providedIn: 'root',
})
export class OAuthHandlerService {
  private readonly socialAccountsService = inject(SocialAccountsService);
  private readonly toastService = inject(ToastService);
  private readonly loggingService = inject(LoggingService);
  private readonly router = inject(Router);

  private readonly oauthSuccessSubject = new Subject<OAuthSuccessEvent>();
  readonly oauthSuccess$ = this.oauthSuccessSubject.asObservable();

  private readonly oauthErrorSubject = new Subject<OAuthErrorEvent>();
  readonly oauthError$ = this.oauthErrorSubject.asObservable();

  private readonly queryParamCallbackSubject = new Subject<{ platform?: string }>();
  readonly queryParamCallback$ = this.queryParamCallbackSubject.asObservable();

  private messageListener?: (event: MessageEvent) => void;

  /**
   * Initialize OAuth message listener to handle OAuth callbacks from popup windows
   */
  initialize(): void {
    if (this.messageListener) {
      // Already initialized
      return;
    }

    this.messageListener = (event: MessageEvent) => {
      // Verify message is from same origin
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data?.type === 'OAUTH_SUCCESS') {
        this.handleOAuthSuccess(event.data as OAuthSuccessEvent);
      } else if (event.data?.type === 'OAUTH_ERROR') {
        this.handleOAuthError(event.data as OAuthErrorEvent);
      }
    };

    window.addEventListener('message', this.messageListener);
  }

  /**
   * Clean up OAuth message listener
   */
  destroy(): void {
    if (this.messageListener) {
      window.removeEventListener('message', this.messageListener);
      this.messageListener = undefined;
    }
  }

  /**
   * Handle OAuth callback from query parameters
   * This is called when the OAuth redirect returns with query params
   */
  handleQueryParamCallback(
    params: { connected?: string | boolean; platform?: string },
    route: ActivatedRoute,
    onRefresh: () => void,
    onClearErrors?: () => void,
  ): void {
    if (params['connected'] === 'true' || params['connected']) {
      const platform = params['platform'] as string | undefined;
      this.loggingService.info(`OAuth callback detected - refreshing accounts for platform: ${platform}`, { platform }, 'OAuthHandlerService');

      // Emit callback event
      this.queryParamCallbackSubject.next({ platform });

      // Refresh accounts immediately
      onRefresh();

      // Also refresh after a delay to catch any delayed backend processing
      setTimeout(() => {
        this.loggingService.debug('Refreshing accounts again after delay', undefined, 'OAuthHandlerService');
        onRefresh();
        
        // Clear profile image errors if callback provided
        if (onClearErrors) {
          onClearErrors();
        }

        // Clear the query parameter after refreshing
        setTimeout(() => {
          this.router.navigate([], {
            relativeTo: route,
            queryParams: { ...route.snapshot.queryParams, connected: null, platform: null },
            queryParamsHandling: 'merge',
            replaceUrl: true,
          });
        }, 100);
      }, 1000); // Delay to ensure backend has processed
    }
  }

  /**
   * Handle OAuth success event from popup window
   */
  private handleOAuthSuccess(event: OAuthSuccessEvent): void {
    this.loggingService.info('OAuth success message received from popup', event, 'OAuthHandlerService');
    
    // Emit success event
    this.oauthSuccessSubject.next(event);

    // Refresh accounts list
    this.socialAccountsService.refresh().subscribe({
      next: () => {
        this.loggingService.info('Accounts refreshed after OAuth success', undefined, 'OAuthHandlerService');
        this.toastService.success(`Successfully connected ${event.platform} account!`);
      },
      error: (error) => {
        this.loggingService.error('Failed to refresh accounts after OAuth', error, 'OAuthHandlerService');
      },
    });
  }

  /**
   * Handle OAuth error event from popup window
   */
  private handleOAuthError(event: OAuthErrorEvent): void {
    this.loggingService.error('OAuth error message received from popup', event, 'OAuthHandlerService');
    
    // Emit error event
    this.oauthErrorSubject.next(event);

    // Show error toast
    this.toastService.error(
      `Failed to connect account: ${event.error || 'Unknown error'}`,
    );
  }
}

