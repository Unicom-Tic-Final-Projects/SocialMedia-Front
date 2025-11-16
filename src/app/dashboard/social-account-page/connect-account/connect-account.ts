import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { Platform } from '../../../models/social.models';
import { SocialAccountsService } from '../../../services/client/social-accounts.service';
import { finalize } from 'rxjs/operators';

type AccountType = 'business' | 'personal' | 'creator';

@Component({
  selector: 'app-connect-account',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule],
  templateUrl: './connect-account.html',
  styleUrl: './connect-account.css',
})
export class ConnectAccount {
  selectedPlatform: Platform | null = null;
  accountName = '';
  accountType: AccountType = 'business';
  isSubmitting = false;

  readonly platforms: Array<{
    value: Platform;
    name: string;
    icon: string;
    color: string;
  }> = [
    { value: 'facebook', name: 'Facebook', icon: 'fa-brands fa-facebook-f', color: '#1877F2' },
    { value: 'instagram', name: 'Instagram', icon: 'fa-brands fa-instagram', color: '#E1306C' },
    { value: 'twitter', name: 'X (Twitter)', icon: 'fa-brands fa-x-twitter', color: '#F2F2F2' },
    { value: 'linkedin', name: 'LinkedIn', icon: 'fa-brands fa-linkedin-in', color: '#0A66C2' },
    { value: 'youtube', name: 'YouTube', icon: 'fa-brands fa-youtube', color: '#FF0000' },
    { value: 'tiktok', name: 'TikTok', icon: 'fa-brands fa-tiktok', color: '#000000' },
  ];

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly socialAccounts: SocialAccountsService
  ) {
    this.route.queryParamMap.subscribe((params) => {
      const platform = params.get('platform') as Platform | null;
      if (platform) {
        this.selectPlatform(platform);
      }
    });
  }

  selectPlatform(platform: Platform): void {
    this.selectedPlatform = platform;
    const definition = this.platforms.find((item) => item.value === platform);
    if (definition) {
      this.accountName = `${definition.name} Account`;
    }
  }

  connectAccount(): void {
    if (!this.selectedPlatform || !this.accountName.trim()) {
      return;
    }

    this.isSubmitting = true;
    this.socialAccounts
      .connect(this.selectedPlatform, this.accountName.trim(), this.accountType)
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: () => this.router.navigate(['/dashboard/social-account/success']),
        error: (error) => console.error('Failed to connect account', error),
      });
  }
}
