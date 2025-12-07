import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule, ActivatedRoute } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { Platform } from '../../models/social.models';
import { SocialAccountsService } from '../../services/client/social-accounts.service';
import { ClientContextService } from '../../services/client/client-context.service';
import { OAuthHandlerService } from '../../services/client/oauth-handler.service';
import { AccountConnectionService } from '../../services/client/account-connection.service';
import { ToastService } from '../../core/services/toast.service';
import { SocialAccountListComponent } from './social-account-list/social-account-list.component';
import { PlatformDefinition } from './social-account-card/social-account-card.component';
import { ManualConnectModalComponent } from './manual-connect-modal/manual-connect-modal.component';
import { LoggingService } from '../../core/services/logging.service';

@Component({
  selector: 'app-social-account-page',
  standalone: true,
  imports: [
    RouterModule,
    CommonModule,
    SocialAccountListComponent,
    ManualConnectModalComponent,
  ],
  templateUrl: './social-account-page.html',
  styleUrl: './social-account-page.css',
})
export class SocialAccountPage implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly socialAccountsService = inject(SocialAccountsService);
  private readonly clientContextService = inject(ClientContextService);
  private readonly oauthHandler = inject(OAuthHandlerService);
  private readonly connectionService = inject(AccountConnectionService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly loggingService = inject(LoggingService);
  private routeSubscription?: Subscription;
  private oauthSubscription?: Subscription;
  private queryParamSubscription?: Subscription;

  showGrid = true;
  profileImageErrors = new Map<Platform, boolean>();

  // Manual connect modal state
  manualConnectModalOpen = false;
  manualConnectPlatform: Platform | null = null;
  manualConnectLoading = false;
  manualConnectError: string | null = null;

  readonly accounts = this.socialAccountsService.accounts;
  readonly platforms: PlatformDefinition[] = [
    { value: 'facebook', name: 'Facebook', icon: 'fa-brands fa-facebook-f', color: '#1877F2' },
    { value: 'instagram', name: 'Instagram', icon: 'fa-brands fa-instagram', color: '#E1306C' },
    { value: 'twitter', name: 'X (Twitter)', icon: 'fa-brands fa-x-twitter', color: '#F2F2F2' },
    { value: 'linkedin', name: 'LinkedIn', icon: 'fa-brands fa-linkedin-in', color: '#0A66C2' },
    { value: 'youtube', name: 'YouTube', icon: 'fa-brands fa-youtube', color: '#FF0000' },
    { value: 'tiktok', name: 'TikTok', icon: 'fa-brands fa-tiktok', color: '#000000' },
  ];

  async ngOnInit(): Promise<void> {
    // Initialize OAuth handler
    this.oauthHandler.initialize();

    // Subscribe to OAuth events
    this.oauthSubscription = this.oauthHandler.oauthSuccess$.subscribe(() => {
      // Accounts are already refreshed by the service, just clear profile image errors
      this.profileImageErrors.clear();
    });

    // Extract clientId from route if available
    let route = this.route;
    while (route.firstChild) {
      route = route.firstChild;
    }

    // Check parent routes for clientId
    let parentRoute = this.route.parent;
    while (parentRoute) {
      const clientId = parentRoute.snapshot.params['clientId'];
      if (clientId) {
        await this.clientContextService.initializeFromRoute(clientId);
        break;
      }
      parentRoute = parentRoute.parent;
    }

    // Load accounts on initialization
    this.loadAccounts();

    // Update showGrid based on route
    this.updateShowGrid();

    // Handle OAuth callback from query parameters
    this.queryParamSubscription = this.route.queryParams.subscribe((params) => {
      this.oauthHandler.handleQueryParamCallback(
        params,
        this.route,
        () => this.loadAccounts(),
        () => this.profileImageErrors.clear(),
      );
    });

    // Listen for route changes
    this.routeSubscription = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateShowGrid();
      });
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
    this.oauthSubscription?.unsubscribe();
    this.queryParamSubscription?.unsubscribe();
    this.oauthHandler.destroy();
  }

  loadAccounts(): void {
    this.loggingService.debug('Loading accounts', {
      isViewingClient: this.clientContextService.isViewingClientDashboard(),
      selectedClient: this.clientContextService.selectedClient(),
      clientUser: this.clientContextService.clientUser(),
    }, 'SocialAccountPage');

    this.socialAccountsService.getSocialAccounts().subscribe({
      next: (accounts) => {
        // Accounts loaded successfully - UI will update automatically via signals
        this.loggingService.debug('Loaded social accounts', { count: accounts.length, accounts }, 'SocialAccountPage');
        // Log connected accounts for debugging
        const connectedAccounts = accounts.filter((acc) => acc.status === 'connected');
        this.loggingService.debug(
          'Connected accounts',
          connectedAccounts.map((acc) => `${acc.platform}: ${acc.accountName}`),
          'SocialAccountPage',
        );

        // Trigger change detection to ensure UI updates immediately
        // Signals should update automatically, but this ensures Angular detects the change
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.loggingService.error('Failed to load social accounts', error, 'SocialAccountPage');
        this.loggingService.error('Error details', {
          status: error?.status,
          statusText: error?.statusText,
          message: error?.message,
          error: error?.error,
        }, 'SocialAccountPage');
        this.cdr.markForCheck();
      },
    });
  }

  hasProfileImageError(platform: Platform): boolean {
    return this.profileImageErrors.get(platform) === true;
  }

  onDisconnect(platform: Platform): void {
    this.connectionService.disconnect(platform, this.route, () => this.loadAccounts());
  }

  onProfileImageError(event: { platform: Platform; error: boolean }): void {
    this.profileImageErrors.set(event.platform, event.error);
  }

  openManualConnectModal(platform: Platform): void {
    this.manualConnectPlatform = platform;
    this.manualConnectError = null;
    this.manualConnectModalOpen = true;
  }

  closeManualConnectModal(): void {
    this.manualConnectModalOpen = false;
    this.manualConnectPlatform = null;
    this.manualConnectError = null;
    this.manualConnectLoading = false;
  }

  submitManualConnect(data: {
    accountId: string;
    accessToken: string;
    username?: string;
    accountName?: string;
    profilePictureUrl?: string;
  }): void {
    if (!this.manualConnectPlatform) {
      return;
    }

    this.manualConnectLoading = true;
    this.manualConnectError = null;

    this.socialAccountsService
      .manualConnect(
        this.manualConnectPlatform,
        data.accountId,
        data.accessToken,
        data.username,
        data.accountName,
        data.profilePictureUrl,
      )
      .pipe(finalize(() => (this.manualConnectLoading = false)))
      .subscribe({
        next: () => {
          this.closeManualConnectModal();
          this.loadAccounts();
        },
        error: (error) => {
          this.loggingService.error('Failed to manually connect account', error, 'SocialAccountPage');
          this.manualConnectError =
            error.error?.message ||
            error.message ||
            'Failed to connect account. Please check your credentials.';
        },
      });
  }

  private updateShowGrid(): void {
    const url = this.router.url;
    // Show grid for both individual dashboard and agency client dashboard routes
    this.showGrid =
      url === '/dashboard/social-account' ||
      url === '/dashboard/social-account/' ||
      url.startsWith('/dashboard/social-account?') ||
      (url.includes('/social-account') &&
        !url.includes('/social-account/connect') &&
        !url.includes('/social-account/callback') &&
        !url.includes('/social-account/connected'));
  }
}
