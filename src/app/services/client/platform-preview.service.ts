import { Injectable } from '@angular/core';
import { Platform, PlatformPreviewConfig } from '../../models/social.models';

@Injectable({
  providedIn: 'root'
})
export class PlatformPreviewService {
  private readonly config: Record<Platform, PlatformPreviewConfig> = {
    facebook: {
      platform: 'facebook',
      width: 1200,
      height: 630,
      label: '1.91:1',
      description: 'Link preview',
      backgroundColor: '#0F0F0F',
    },
    instagram: {
      platform: 'instagram',
      width: 1080,
      height: 1350,
      label: '4:5',
      description: 'Feed portrait',
      backgroundColor: '#0F0F0F',
    },
    twitter: {
      platform: 'twitter',
      width: 1200,
      height: 675,
      label: '16:9',
      description: 'Media tweet',
      backgroundColor: '#0F0F0F',
    },
    linkedin: {
      platform: 'linkedin',
      width: 1200,
      height: 627,
      label: '1.91:1',
      description: 'Share card',
      backgroundColor: '#0F0F0F',
    },
    youtube: {
      platform: 'youtube',
      width: 1280,
      height: 720,
      label: '16:9',
      description: 'Thumbnail',
      backgroundColor: '#000000',
    },
  };

  getAspect(platform: Platform): PlatformPreviewConfig {
    return this.config[platform];
  }

  getAll(): PlatformPreviewConfig[] {
    return Object.values(this.config);
  }

  getDisplaySize(platform: Platform, maxWidth: number = 360): { width: number; height: number } {
    const { width, height } = this.getAspect(platform);
    if (width <= maxWidth) {
      return { width, height };
    }
    const ratio = height / width;
    return {
      width: maxWidth,
      height: Math.round(maxWidth * ratio),
    };
  }

  /**
   * Backwards compatible helper mirroring older API naming.
   */
  getDisplayDimensions(platform: Platform, maxWidth: number = 360): { width: number; height: number } {
    return this.getDisplaySize(platform, maxWidth);
  }
}
