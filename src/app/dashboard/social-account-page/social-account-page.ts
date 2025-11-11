import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Platform } from '../../models/social.models';
import { PostsService } from '../../services/client/posts.service';
import { SocialAccountsService } from '../../services/client/social-accounts.service';
import { PostPreviewModal } from './post-preview/post-preview-modal';

@Component({
  selector: 'app-social-account-page',
  standalone: true,
  imports: [RouterModule, CommonModule, PostPreviewModal],
  templateUrl: './social-account-page.html',
  styleUrl: './social-account-page.css',
})
export class SocialAccountPage {
  showGrid = true;

  previewOpen = false;
  previewMediaUrl = '';
  previewCaption = '';
  previewTargets: Platform[] = [];

  readonly platforms: Array<{ value: Platform; name: string; icon: string; color: string }> = [
    { value: 'facebook', name: 'Facebook', icon: 'fa-brands fa-facebook-f', color: '#1877F2' },
    { value: 'instagram', name: 'Instagram', icon: 'fa-brands fa-instagram', color: '#E1306C' },
    { value: 'twitter', name: 'X (Twitter)', icon: 'fa-brands fa-x-twitter', color: '#F2F2F2' },
    { value: 'linkedin', name: 'LinkedIn', icon: 'fa-brands fa-linkedin-in', color: '#0A66C2' },
    { value: 'youtube', name: 'YouTube', icon: 'fa-brands fa-youtube', color: '#FF0000' },
    { value: 'tiktok', name: 'TikTok', icon: 'fa-brands fa-tiktok', color: '#FFFFFF' },
    { value: 'pinterest', name: 'Pinterest', icon: 'fa-brands fa-pinterest-p', color: '#E60023' },
    { value: 'snapchat', name: 'Snapchat', icon: 'fa-brands fa-snapchat-ghost', color: '#FFFC00' },
    { value: 'reddit', name: 'Reddit', icon: 'fa-brands fa-reddit-alien', color: '#FF4500' },
    { value: 'threads', name: 'Threads', icon: 'fa-brands fa-threads', color: '#F2F2F2' },
    { value: 'telegram', name: 'Telegram', icon: 'fa-brands fa-telegram-plane', color: '#229ED9' },
    { value: 'whatsapp', name: 'WhatsApp', icon: 'fa-brands fa-whatsapp', color: '#25D366' },
    { value: 'discord', name: 'Discord', icon: 'fa-brands fa-discord', color: '#5865F2' },
    { value: 'tumblr', name: 'Tumblr', icon: 'fa-brands fa-tumblr', color: '#34526F' },
    { value: 'twitch', name: 'Twitch', icon: 'fa-brands fa-twitch', color: '#9146FF' },
  ];

  constructor(
    private readonly router: Router,
    private readonly postsService: PostsService,
    private readonly socialAccountsService: SocialAccountsService
  ) {
    this.updateShowGrid();
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => this.updateShowGrid());
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

  private updateShowGrid(): void {
    const url = this.router.url;
    this.showGrid =
      url === '/dashboard/social-account' ||
      url === '/dashboard/social-account/' ||
      url.startsWith('/dashboard/social-account?');
  }
}
