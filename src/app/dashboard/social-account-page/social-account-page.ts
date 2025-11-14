import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Platform } from '../../models/social.models';
import { PostsService } from '../../services/client/posts.service';
import { SocialAccountsService } from '../../services/client/social-accounts.service';
import { PostPreviewModal } from './post-preview/post-preview-modal';
import { finalize } from 'rxjs/operators';

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
  connectingPlatform: Platform | null = null;

  readonly platforms: Array<{ value: Platform; name: string; icon: string; color: string }> = [
    { value: 'facebook', name: 'Facebook', icon: 'fa-brands fa-facebook-f', color: '#1877F2' },
    { value: 'instagram', name: 'Instagram', icon: 'fa-brands fa-instagram', color: '#E1306C' },
    { value: 'twitter', name: 'X (Twitter)', icon: 'fa-brands fa-x-twitter', color: '#F2F2F2' },
    { value: 'linkedin', name: 'LinkedIn', icon: 'fa-brands fa-linkedin-in', color: '#0A66C2' },
    { value: 'youtube', name: 'YouTube', icon: 'fa-brands fa-youtube', color: '#FF0000' },
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

  private updateShowGrid(): void {
    const url = this.router.url;
    this.showGrid =
      url === '/dashboard/social-account' ||
      url === '/dashboard/social-account/' ||
      url.startsWith('/dashboard/social-account?');
  }
}
