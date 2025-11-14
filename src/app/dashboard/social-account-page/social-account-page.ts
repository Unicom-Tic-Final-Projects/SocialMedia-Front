import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterModule, ActivatedRoute } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { Platform, SocialAccount } from '../../models/social.models';
import { PostsService } from '../../services/client/posts.service';
import { SocialAccountsService } from '../../services/client/social-accounts.service';
import { PostPreviewModal } from './post-preview/post-preview-modal';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-social-account-page',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule, PostPreviewModal],
  templateUrl: './social-account-page.html',
  styleUrl: './social-account-page.css',
})
export class SocialAccountPage implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly postsService = inject(PostsService);
  private readonly socialAccountsService = inject(SocialAccountsService);
  private routeSubscription?: Subscription;

  showGrid = true;

  previewOpen = false;
  previewMediaUrl = '';
  previewCaption = '';
  previewTargets: Platform[] = [];
  connectingPlatform: Platform | null = null;
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
  ];

  ngOnInit(): void {
    // Load accounts on initialization
    this.loadAccounts();

    // Update showGrid based on route
    this.updateShowGrid();
    
    // Check query params for successful connection and refresh accounts
    this.route.queryParams.subscribe((params) => {
      if (params['connected']) {
        // Refresh accounts when coming back from successful connection
        // Use a small delay to ensure backend has processed the connection
        setTimeout(() => {
          this.loadAccounts();
          // Reset profile image errors when refreshing
          this.profileImageErrors.clear();
        }, 500);
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
    this.socialAccountsService.getSocialAccounts().subscribe({
      next: (accounts) => {
        // Accounts loaded successfully - UI will update automatically via signals
        console.log('Loaded social accounts:', accounts.length);
      },
      error: (error) => {
        console.error('Failed to load social accounts:', error);
      },
    });
  }

  openPreview(platform: Platform): void {
    const draft = this.postsService.getActiveDraft();
    this.previewMediaUrl = draft?.mediaUrl ?? '';
    this.previewCaption = draft?.caption ?? '';
    this.previewTargets =
      (draft?.selectedPlatforms?.length ? draft.selectedPlatforms : [platform]) as Platform[];
    this.previewOpen = true;
  }

  closePreview(): void {
    this.previewOpen = false;
  }

  isConnected(platform: Platform): boolean {
    return this.socialAccountsService.isConnected(platform);
  }

  getConnectedAccount(platform: Platform): SocialAccount | undefined {
    return this.accounts().find(
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

    // Instagram now uses Business Login OAuth flow
    // No special handling needed - use standard OAuth flow

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
    this.showGrid =
      url === '/dashboard/social-account' ||
      url === '/dashboard/social-account/' ||
      url.startsWith('/dashboard/social-account?');
  }
}
