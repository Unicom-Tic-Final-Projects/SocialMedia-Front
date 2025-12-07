import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, finalize } from 'rxjs';
import { Platform, SocialAccount } from '../../models/social.models';
import { SocialAccountsService } from './social-accounts.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmationService } from '../../core/services/confirmation.service';
import { LoggingService } from '../../core/services/logging.service';

@Injectable({
  providedIn: 'root',
})
export class AccountConnectionService {
  private readonly socialAccountsService = inject(SocialAccountsService);
  private readonly toastService = inject(ToastService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly router = inject(Router);
  private readonly loggingService = inject(LoggingService);

  private readonly connectingPlatformSignal = signal<Platform | null>(null);
  readonly connectingPlatform = this.connectingPlatformSignal.asReadonly();

  private readonly disconnectingPlatformSignal = signal<Platform | null>(null);
  readonly disconnectingPlatform = this.disconnectingPlatformSignal.asReadonly();

  /**
   * Get connected account for a platform
   */
  getConnectedAccount(platform: Platform): SocialAccount | undefined {
    return this.socialAccountsService
      .accounts()
      .find(
        (acc) =>
          acc.platform.toLowerCase() === platform.toLowerCase() && acc.status === 'connected',
      );
  }

  /**
   * Check if a platform is currently connecting
   */
  isConnecting(platform: Platform): boolean {
    return this.connectingPlatform() === platform;
  }

  /**
   * Check if a platform is currently disconnecting
   */
  isDisconnecting(platform: Platform): boolean {
    return this.disconnectingPlatform() === platform;
  }

  /**
   * Connect a social media account
   */
  connect(
    platform: Platform,
    platforms: Array<{ value: Platform; name: string }>,
    onSuccess?: () => void,
  ): Observable<unknown> {
    if (this.isConnecting(platform)) {
      return new Observable((subscriber) => subscriber.complete());
    }

    // Instagram Business accounts must be accessed through Facebook
    if (platform === 'instagram') {
      const facebookAccount = this.getConnectedAccount('facebook');
      if (!facebookAccount) {
        this.toastService.warning(
          'Instagram requires Facebook connection. Please connect your Facebook account (with a Facebook Page) first. Make sure your Instagram Business account is linked to that Facebook Page in the Instagram app.',
        );
        return new Observable((subscriber) => subscriber.complete());
      } else {
        this.toastService.info(
          'Instagram is accessed through Facebook. When you post to Instagram, select Facebook as the platform - Instagram will be published automatically if your Instagram Business account is linked to your Facebook Page.',
        );
        return new Observable((subscriber) => subscriber.complete());
      }
    }

    const definition = platforms.find((item) => item.value === platform);
    const accountName = definition ? `${definition.name} Account` : `${platform} Account`;

    this.connectingPlatformSignal.set(platform);

    return this.socialAccountsService.connect(platform, accountName, 'business').pipe(
      finalize(() => {
        this.connectingPlatformSignal.set(null);
        if (onSuccess) {
          onSuccess();
        }
      }),
    );
  }

  /**
   * Disconnect a social media account
   */
  disconnect(
    platform: Platform,
    route: any,
    onRefresh: () => void,
  ): void {
    const account = this.getConnectedAccount(platform);
    if (!account) {
      this.loggingService.error('No connected account found for platform', { platform }, 'AccountConnectionService');
      return;
    }

    if (this.isDisconnecting(platform)) {
      return;
    }

    // Use confirmation dialog
    this.confirmationService
      .confirm({
        title: 'Disconnect Account',
        message: `Are you sure you want to disconnect your ${platform} account? You'll need to reconnect to publish posts to this platform.`,
        confirmText: 'Disconnect',
        cancelText: 'Cancel',
        confirmButtonClass: 'bg-red-500 hover:bg-red-600',
      })
      .then((confirmed) => {
        if (!confirmed) {
          return;
        }

        this.disconnectAccountConfirmed(account, platform, route, onRefresh);
      });
  }

  /**
   * Disconnect account after confirmation
   */
  private disconnectAccountConfirmed(
    account: SocialAccount,
    platform: Platform,
    route: any,
    onRefresh: () => void,
  ): void {
    this.disconnectingPlatformSignal.set(platform);

    // Clear query parameters immediately to prevent refresh issues
    this.router.navigate([], {
      relativeTo: route,
      queryParams: {},
      replaceUrl: true,
    });

    this.socialAccountsService
      .disconnect(account.id)
      .pipe(
        finalize(() => {
          this.disconnectingPlatformSignal.set(null);
          // Reload accounts to update UI from backend
          setTimeout(() => {
            onRefresh();
          }, 100);
        }),
      )
      .subscribe({
        next: () => {
          this.loggingService.debug(`Successfully disconnected ${platform} account`, { platform, accountId: account.id }, 'AccountConnectionService');

          // The service already removes it from the signal, but verify
          const remainingAccounts = this.socialAccountsService.accounts();
          const stillExists = remainingAccounts.some((acc) => acc.id === account.id);
          this.loggingService.debug(`Account still in list after disconnect: ${stillExists}`, { accountId: account.id, stillExists }, 'AccountConnectionService');

          setTimeout(() => {
            this.toastService.success(`${platform} account disconnected successfully`);
            // Force a refresh to ensure UI is updated
            onRefresh();
          }, 0);
        },
        error: (error) => {
          this.loggingService.error('Failed to disconnect account', error, 'AccountConnectionService');
          this.loggingService.error('Error details', {
            status: error?.status,
            message: error?.message,
            error: error?.error,
          }, 'AccountConnectionService');
          setTimeout(() => {
            this.toastService.error(
              `Failed to disconnect account: ${error.error?.message || error.message || 'Unknown error'}`,
            );
            // Reload accounts even on error to ensure UI is in sync
            onRefresh();
          }, 0);
        },
      });
  }

  /**
   * Navigate to manage account page
   */
  navigateToManage(platform: Platform): void {
    this.router.navigate(['/dashboard/social-account/connected'], {
      queryParams: { platform },
    });
  }
}

