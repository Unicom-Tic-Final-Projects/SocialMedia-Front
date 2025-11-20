import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterModule, ActivatedRoute } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { Platform, SocialAccount } from '../../models/social.models';
import { PostsService } from '../../services/client/posts.service';
import { SocialAccountsService } from '../../services/client/social-accounts.service';
import { ClientContextService } from '../../services/client/client-context.service';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmationService } from '../../core/services/confirmation.service';

@Component({
  selector: 'app-social-account-page',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule],
  templateUrl: './social-account-page.html',
  styleUrl: './social-account-page.css',
})
export class SocialAccountPage implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly socialAccountsService = inject(SocialAccountsService); // Made public for template access
  readonly clientContextService = inject(ClientContextService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly cdr = inject(ChangeDetectorRef);
  private routeSubscription?: Subscription;
  
  // Client context
  readonly isViewingClient = this.clientContextService.isViewingClientDashboard;
  readonly selectedClient = this.clientContextService.selectedClient;

  // Team member read-only view detection
  readonly isTeamMember = computed(() => {
    const user = this.authService.user();
    return !!user && user.tenantType === 'Agency' && (user.role === 'Editor' || user.role === 'Admin');
  });

  showGrid = true;

  connectingPlatform: Platform | null = null;
  disconnectingPlatform: Platform | null = null;
  private profileImageErrors = new Map<Platform, boolean>();

  // Manual connect modal state (for Instagram)
  manualConnectModalOpen = false;
  manualConnectPlatform: Platform | null = null;
  manualAccountId = '';
  manualAccessToken = '';
  manualUsername = '';
  manualAccountName = '';
  manualProfilePictureUrl = '';
  manualConnectLoading = false;
  manualConnectError: string | null = null;

  readonly accounts = this.socialAccountsService.accounts;
  readonly platforms: Array<{ value: Platform; name: string; icon: string; color: string }> = [
    { value: 'facebook', name: 'Facebook', icon: 'fa-brands fa-facebook-f', color: '#1877F2' },
    { value: 'instagram', name: 'Instagram', icon: 'fa-brands fa-instagram', color: '#E1306C' },
    { value: 'twitter', name: 'X (Twitter)', icon: 'fa-brands fa-x-twitter', color: '#F2F2F2' },
    { value: 'linkedin', name: 'LinkedIn', icon: 'fa-brands fa-linkedin-in', color: '#0A66C2' },
    { value: 'youtube', name: 'YouTube', icon: 'fa-brands fa-youtube', color: '#FF0000' },
    { value: 'tiktok', name: 'TikTok', icon: 'fa-brands fa-tiktok', color: '#000000' },
  ];

  async ngOnInit(): Promise<void> {
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
    
    // Check query params for successful connection and refresh accounts
    this.route.queryParams.subscribe((params) => {
      if (params['connected'] === 'true' || params['connected']) {
        const platform = params['platform'] as string | undefined;
        console.log('OAuth callback detected - refreshing accounts for platform:', platform);
        
        // Refresh accounts immediately, then again after delay to ensure backend has processed
        this.loadAccounts();
        
        // Also refresh after a delay to catch any delayed backend processing
        setTimeout(() => {
          console.log('Refreshing accounts again after delay');
          this.loadAccounts();
          // Reset profile image errors when refreshing
          this.profileImageErrors.clear();
          
          // Clear the query parameter after refreshing to avoid refreshing again on navigation
          setTimeout(() => {
            this.router.navigate([], {
              relativeTo: this.route,
              queryParams: { ...this.route.snapshot.queryParams, connected: null, platform: null },
              queryParamsHandling: 'merge',
              replaceUrl: true,
            });
          }, 100);
        }, 1000); // Increased delay to 1 second to ensure backend has processed
      }
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
  }

  loadAccounts(): void {
    console.log('[SocialAccountPage] Loading accounts...');
    console.log('[SocialAccountPage] Is viewing client:', this.isViewingClient());
    console.log('[SocialAccountPage] Selected client:', this.selectedClient());
    console.log('[SocialAccountPage] Client user:', this.clientContextService.clientUser());
    
    this.socialAccountsService.getSocialAccounts().subscribe({
      next: (accounts) => {
        // Accounts loaded successfully - UI will update automatically via signals
        console.log('[SocialAccountPage] Loaded social accounts:', accounts.length);
        console.log('[SocialAccountPage] Accounts:', accounts);
        // Log connected accounts for debugging
        const connectedAccounts = accounts.filter(acc => acc.status === 'connected');
        console.log('[SocialAccountPage] Connected accounts:', connectedAccounts.map(acc => `${acc.platform}: ${acc.accountName}`));
        
        // Trigger change detection to ensure UI updates immediately
        // Signals should update automatically, but this ensures Angular detects the change
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('[SocialAccountPage] Failed to load social accounts:', error);
        console.error('[SocialAccountPage] Error details:', {
          status: error?.status,
          statusText: error?.statusText,
          message: error?.message,
          error: error?.error
        });
        this.cdr.markForCheck();
      },
    });
  }

  isConnected(platform: Platform): boolean {
    return this.socialAccountsService.isConnected(platform);
  }

  getConnectedAccount(platform: Platform): SocialAccount | undefined {
    // Use the service's accounts signal directly to ensure we get the latest state
    return this.socialAccountsService.accounts().find(
      (acc) => acc.platform.toLowerCase() === platform.toLowerCase() && acc.status === 'connected'
    );
  }

  onProfileImageError(event: Event, platform: Platform): void {
    this.profileImageErrors.set(platform, true);
    const img = event.target as HTMLImageElement;
    if (img) {
      img.style.display = 'none';
    }
  }

  shouldShowProfilePicture(platform: Platform): boolean {
    const account = this.getConnectedAccount(platform);
    return !!account?.profilePictureUrl && !this.profileImageErrors.get(platform);
  }

  shouldShowIconFallback(platform: Platform): boolean {
    const account = this.getConnectedAccount(platform);
    return !account?.profilePictureUrl || this.hasProfileImageError(platform);
  }

  hasProfileImageError(platform: Platform): boolean {
    return this.profileImageErrors.get(platform) === true;
  }

  isConnecting(platform: Platform): boolean {
    return this.connectingPlatform === platform;
  }

  isDisconnecting(platform: Platform): boolean {
    return this.disconnectingPlatform === platform;
  }

  disconnectAccount(platform: Platform): void {
    const account = this.getConnectedAccount(platform);
    if (!account) {
      console.error('No connected account found for platform:', platform);
      return;
    }

    if (this.isDisconnecting(platform)) {
      return;
    }

    // Use confirmation dialog instead of browser confirm
    this.confirmationService.confirm({
      title: 'Disconnect Account',
      message: `Are you sure you want to disconnect your ${platform} account? You'll need to reconnect to publish posts to this platform.`,
      confirmText: 'Disconnect',
      cancelText: 'Cancel',
      confirmButtonClass: 'bg-red-500 hover:bg-red-600'
    }).then((confirmed) => {
      if (!confirmed) {
        return;
      }
      
      this.disconnectAccountConfirmed(account, platform);
    });

    // This method is called after confirmation
  }

  private disconnectAccountConfirmed(account: SocialAccount, platform: Platform): void {
    this.disconnectingPlatform = platform;
    
    // Clear query parameters immediately to prevent refresh issues
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      replaceUrl: true,
    });
    
    this.socialAccountsService
      .disconnect(account.id)
      .pipe(finalize(() => {
        this.disconnectingPlatform = null;
        // Reload accounts to update UI from backend
        setTimeout(() => {
          this.loadAccounts();
        }, 100);
      }))
      .subscribe({
        next: () => {
          console.log(`Successfully disconnected ${platform} account`);
          console.log(`Account ${account.id} should be removed from list`);
          
          // The service already removes it from the signal, but verify
          const remainingAccounts = this.socialAccountsService.accounts();
          const stillExists = remainingAccounts.some(acc => acc.id === account.id);
          console.log(`Account still in list after disconnect: ${stillExists}`);
          
          setTimeout(() => {
            this.toastService.success(`${platform} account disconnected successfully`);
            // Force a refresh to ensure UI is updated
            this.loadAccounts();
          }, 0);
        },
        error: (error) => {
          console.error('Failed to disconnect account:', error);
          console.error('Error details:', {
            status: error?.status,
            message: error?.message,
            error: error?.error
          });
          setTimeout(() => {
            this.toastService.error(`Failed to disconnect account: ${error.error?.message || error.message || 'Unknown error'}`);
            // Reload accounts even on error to ensure UI is in sync
            this.loadAccounts();
          }, 0);
        },
      });
  }

  connectOrManage(platform: Platform): void {
    if (this.isConnected(platform)) {
      this.router.navigate(['/dashboard/social-account/connected'], {
        queryParams: { platform }
      });
      return;
    }

    if (this.isConnecting(platform)) {
      return;
    }

    // Instagram Business accounts must be accessed through Facebook
    if (platform === 'instagram') {
      // Check if Facebook is connected
      const facebookAccount = this.getConnectedAccount('facebook');
      if (!facebookAccount) {
        this.toastService.warning(
          'Instagram requires Facebook connection. Please connect your Facebook account (with a Facebook Page) first. Make sure your Instagram Business account is linked to that Facebook Page in the Instagram app.'
        );
        return;
      } else {
        this.toastService.info(
          'Instagram is accessed through Facebook. When you post to Instagram, select Facebook as the platform - Instagram will be published automatically if your Instagram Business account is linked to your Facebook Page.'
        );
        return;
      }
    }

    const definition = this.platforms.find((item) => item.value === platform);
    const accountName = definition ? `${definition.name} Account` : `${platform} Account`;

    this.connectingPlatform = platform;
    this.socialAccountsService
      .connect(platform, accountName, 'business')
      .pipe(finalize(() => (this.connectingPlatform = null)))
      .subscribe({
        error: (error) => console.error('Failed to start connection flow', error),
      });
  }

  openManualConnectModal(platform: Platform): void {
    this.manualConnectPlatform = platform;
    this.manualAccountId = '';
    this.manualAccessToken = '';
    this.manualUsername = '';
    this.manualAccountName = '';
    this.manualProfilePictureUrl = '';
    this.manualConnectError = null;
    this.manualConnectModalOpen = true;
  }

  closeManualConnectModal(): void {
    this.manualConnectModalOpen = false;
    this.manualConnectPlatform = null;
    this.manualAccountId = '';
    this.manualAccessToken = '';
    this.manualUsername = '';
    this.manualAccountName = '';
    this.manualProfilePictureUrl = '';
    this.manualConnectError = null;
    this.manualConnectLoading = false;
  }

  submitManualConnect(): void {
    if (!this.manualConnectPlatform || !this.manualAccountId || !this.manualAccessToken) {
      this.manualConnectError = 'Account ID and Access Token are required';
      return;
    }

    this.manualConnectLoading = true;
    this.manualConnectError = null;

    this.socialAccountsService
      .manualConnect(
        this.manualConnectPlatform,
        this.manualAccountId,
        this.manualAccessToken,
        this.manualUsername || undefined,
        this.manualAccountName || undefined,
        this.manualProfilePictureUrl || undefined
      )
      .pipe(finalize(() => (this.manualConnectLoading = false)))
      .subscribe({
        next: () => {
          this.closeManualConnectModal();
          this.loadAccounts();
        },
        error: (error) => {
          console.error('Failed to manually connect account:', error);
          this.manualConnectError = error.error?.message || error.message || 'Failed to connect account. Please check your credentials.';
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
      url.includes('/social-account') && !url.includes('/social-account/connect') && !url.includes('/social-account/callback') && !url.includes('/social-account/connected');
  }
}
