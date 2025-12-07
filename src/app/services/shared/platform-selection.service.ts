import { Injectable } from '@angular/core';
import { Platform, SocialAccount } from '../../models/social.models';

/**
 * Service for managing platform and account selection logic
 * Shared across post-editor and post-creator components
 */
@Injectable({
  providedIn: 'root',
})
export class PlatformSelectionService {
  /**
   * Get all available platforms
   */
  getAllPlatforms(): Platform[] {
    return ['facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'tiktok', 'pinterest'];
  }

  /**
   * Get connected accounts for a specific platform
   */
  getConnectedAccountsForPlatform(platform: Platform, accounts: SocialAccount[]): SocialAccount[] {
    return accounts.filter(
      (acc) => acc.platform.toLowerCase() === platform.toLowerCase() && acc.status === 'connected',
    );
  }

  /**
   * Get account IDs from selected platforms
   * Converts platform selections into actual account IDs
   */
  getAccountIdsFromSelectedPlatforms(
    selectedPlatforms: Platform[],
    accounts: SocialAccount[],
  ): string[] {
    if (selectedPlatforms.length === 0) {
      return [];
    }

    const accountIds: string[] = [];
    selectedPlatforms.forEach((platform) => {
      const platformAccounts = this.getConnectedAccountsForPlatform(platform, accounts);
      platformAccounts.forEach((account) => {
        if (!accountIds.includes(account.id)) {
          accountIds.push(account.id);
        }
      });
    });

    return accountIds;
  }

  /**
   * Group accounts by platform
   */
  groupAccountsByPlatform(accounts: SocialAccount[]): Map<string, SocialAccount[]> {
    const grouped = new Map<string, SocialAccount[]>();
    accounts.forEach((account) => {
      const platform = account.platform;
      if (!grouped.has(platform)) {
        grouped.set(platform, []);
      }
      grouped.get(platform)!.push(account);
    });
    return grouped;
  }

  /**
   * Toggle platform in selection list
   */
  togglePlatform(platform: Platform, selectedPlatforms: Platform[]): Platform[] {
    const isSelected = selectedPlatforms.includes(platform);
    return isSelected
      ? selectedPlatforms.filter((p) => p !== platform)
      : [...selectedPlatforms, platform];
  }

  /**
   * Toggle account in selection list
   */
  toggleAccount(accountId: string, selectedAccountIds: string[]): string[] {
    const isSelected = selectedAccountIds.includes(accountId);
    return isSelected
      ? selectedAccountIds.filter((id) => id !== accountId)
      : [...selectedAccountIds, accountId];
  }

  /**
   * Check if platform is selected
   */
  isPlatformSelected(platform: Platform, selectedPlatforms: Platform[]): boolean {
    return selectedPlatforms.includes(platform);
  }

  /**
   * Check if account is selected
   */
  isAccountSelected(accountId: string, selectedAccountIds: string[]): boolean {
    return selectedAccountIds.includes(accountId);
  }

  /**
   * Validate that at least one platform is selected
   */
  validatePlatformSelection(selectedPlatforms: Platform[]): {
    valid: boolean;
    error?: string;
  } {
    if (selectedPlatforms.length === 0) {
      return {
        valid: false,
        error: 'Please select at least one platform',
      };
    }
    return { valid: true };
  }

  /**
   * Validate that at least one account is selected
   */
  validateAccountSelection(selectedAccountIds: string[]): {
    valid: boolean;
    error?: string;
  } {
    if (selectedAccountIds.length === 0) {
      return {
        valid: false,
        error: 'Please select at least one account',
      };
    }
    return { valid: true };
  }

  /**
   * Get platform display name
   */
  getPlatformDisplayName(platform: Platform): string {
    const names: Record<Platform, string> = {
      facebook: 'Facebook',
      instagram: 'Instagram',
      twitter: 'Twitter',
      linkedin: 'LinkedIn',
      youtube: 'YouTube',
      tiktok: 'TikTok',
      pinterest: 'Pinterest',
    };
    return names[platform] || platform;
  }

  /**
   * Get platform icon class (Font Awesome)
   */
  getPlatformIcon(platform: Platform): string {
    const icons: Record<Platform, string> = {
      facebook: 'fa-brands fa-facebook',
      instagram: 'fa-brands fa-instagram',
      twitter: 'fa-brands fa-twitter',
      linkedin: 'fa-brands fa-linkedin',
      youtube: 'fa-brands fa-youtube',
      tiktok: 'fa-brands fa-tiktok',
      pinterest: 'fa-brands fa-pinterest',
    };
    return icons[platform] || 'fa-solid fa-share';
  }
}

