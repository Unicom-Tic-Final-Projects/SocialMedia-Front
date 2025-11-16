import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Platform, SocialAccount } from '../../../models/social.models';

interface PlatformAspectRatio {
  name: string;
  ratio: string;
  width: string;
  height: string;
  maxWidth: string;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-post-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './post-preview.component.html',
  styleUrl: './post-preview.component.css',
})
export class PostPreviewComponent {
  @Input() content: string = '';
  @Input() mediaUrl: string | null = null;
  @Input() selectedAccounts: SocialAccount[] = [];

  platformConfigs: Record<Platform, PlatformAspectRatio[]> = {
    facebook: [
      {
        name: 'Facebook Post',
        ratio: '1:1',
        width: '470px',
        height: '470px',
        maxWidth: '100%',
        icon: 'fa-brands fa-facebook',
        color: '#1877F2',
      },
      {
        name: 'Facebook Landscape',
        ratio: '16:9',
        width: '470px',
        height: '264px',
        maxWidth: '100%',
        icon: 'fa-brands fa-facebook',
        color: '#1877F2',
      },
      {
        name: 'Facebook Portrait',
        ratio: '4:5',
        width: '470px',
        height: '588px',
        maxWidth: '100%',
        icon: 'fa-brands fa-facebook',
        color: '#1877F2',
      },
    ],
    linkedin: [
      {
        name: 'LinkedIn Post',
        ratio: '1:1',
        width: '552px',
        height: '552px',
        maxWidth: '100%',
        icon: 'fa-brands fa-linkedin',
        color: '#0077B5',
      },
      {
        name: 'LinkedIn Landscape',
        ratio: '16:9',
        width: '552px',
        height: '310px',
        maxWidth: '100%',
        icon: 'fa-brands fa-linkedin',
        color: '#0077B5',
      },
    ],
    instagram: [
      {
        name: 'Instagram Square',
        ratio: '1:1',
        width: '500px',
        height: '500px',
        maxWidth: '100%',
        icon: 'fa-brands fa-instagram',
        color: '#E4405F',
      },
      {
        name: 'Instagram Portrait',
        ratio: '4:5',
        width: '500px',
        height: '625px',
        maxWidth: '100%',
        icon: 'fa-brands fa-instagram',
        color: '#E4405F',
      },
      {
        name: 'Instagram Story/Reels',
        ratio: '9:16',
        width: '500px',
        height: '889px',
        maxWidth: '100%',
        icon: 'fa-brands fa-instagram',
        color: '#E4405F',
      },
    ],
    twitter: [
      {
        name: 'Twitter Image',
        ratio: '16:9',
        width: '506px',
        height: '285px',
        maxWidth: '100%',
        icon: 'fa-brands fa-twitter',
        color: '#1DA1F2',
      },
      {
        name: 'Twitter Square',
        ratio: '1:1',
        width: '506px',
        height: '506px',
        maxWidth: '100%',
        icon: 'fa-brands fa-twitter',
        color: '#1DA1F2',
      },
    ],
    youtube: [
      {
        name: 'YouTube Thumbnail',
        ratio: '16:9',
        width: '640px',
        height: '360px',
        maxWidth: '100%',
        icon: 'fa-brands fa-youtube',
        color: '#FF0000',
      },
    ],
    tiktok: [
      {
        name: 'TikTok Vertical Video',
        ratio: '9:16',
        width: '540px',
        height: '960px',
        maxWidth: '100%',
        icon: 'fa-brands fa-tiktok',
        color: '#000000',
      },
    ],
  };

  get selectedPlatforms(): Platform[] {
    return Array.from(new Set(this.selectedAccounts.map((acc) => acc.platform))) as Platform[];
  }

  getPlatformConfigs(platform: Platform): PlatformAspectRatio[] {
    return this.platformConfigs[platform] || this.platformConfigs.facebook;
  }

  getDefaultPlatformConfig(platform: Platform): PlatformAspectRatio {
    const configs = this.platformConfigs[platform] || this.platformConfigs.facebook;
    return configs[0]; // Return first aspect ratio as default
  }

  getAccountsByPlatform(platform: Platform): SocialAccount[] {
    return this.selectedAccounts.filter(acc => acc.platform === platform);
  }

  hasMedia(): boolean {
    return !!this.mediaUrl;
  }

  getMediaType(): 'image' | 'video' | null {
    if (!this.mediaUrl) return null;
    const ext = this.mediaUrl.split('.').pop()?.toLowerCase();
    if (['mp4', 'mov', 'webm', 'avi'].includes(ext || '')) {
      return 'video';
    }
    return 'image';
  }

  // Get account display name for preview
  getAccountDisplayName(account: SocialAccount): string {
    return account.displayName || account.accountName || account.platformUsername || `${account.platform} Account`;
  }

  // Get account profile picture or default
  getAccountProfilePicture(account: SocialAccount): string {
    return account.profilePictureUrl || this.getDefaultProfilePicture(account.platform);
  }

  // Get default profile picture based on platform
  getDefaultProfilePicture(platform: Platform): string {
    const colors: Record<Platform, string> = {
      facebook: '#1877F2',
      instagram: '#E4405F',
      linkedin: '#0077B5',
      twitter: '#1DA1F2',
      youtube: '#FF0000',
      tiktok: '#000000',
    };
    // Return a data URI for a colored circle (placeholder)
    const color = colors[platform] || '#666666';
    return `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='${encodeURIComponent(color)}' opacity='0.3'/><circle cx='50' cy='40' r='15' fill='${encodeURIComponent(color)}'/><path d='M30 70 Q30 60 50 60 Q70 60 70 70' fill='${encodeURIComponent(color)}'/></svg>`;
  }

  // Format time as "just now" for preview
  getTimeAgo(): string {
    return 'Just now';
  }

  // Truncate content for preview (platform-specific limits)
  getTruncatedContent(platform: Platform, content: string, maxLength: number = 280): string {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  }

  // Get platform-specific content limits
  getContentLimit(platform: Platform): number {
    const limits: Record<Platform, number> = {
      facebook: 63206,
      instagram: 2200,
      linkedin: 3000,
      twitter: 280,
      youtube: 5000,
      tiktok: 2200,
    };
    return limits[platform] || 280;
  }
}

