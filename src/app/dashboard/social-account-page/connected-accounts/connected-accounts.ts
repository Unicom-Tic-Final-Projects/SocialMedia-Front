import { AsyncPipe, DatePipe, NgClass, TitleCasePipe } from '@angular/common';
import { Component, inject, OnDestroy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LoggingService } from '../../../core/services/logging.service';
import { Platform, SocialAccount } from '../../../models/social.models';
import { SocialAccountsService } from '../../../services/client/social-accounts.service';
import { BaseComponent } from '../../../core/base/base.component';

interface PlatformMeta {
  icon: string;
  name: string;
  color: string;
}

@Component({
  selector: 'app-connected-accounts',
  standalone: true,
  imports: [RouterModule, AsyncPipe, DatePipe, TitleCasePipe, NgClass],
  templateUrl: './connected-accounts.html',
  styleUrl: './connected-accounts.css',
})
export class ConnectedAccounts extends BaseComponent {
  readonly accounts$: Observable<SocialAccount[]>;
  private readonly loggingService = inject(LoggingService);

  readonly platformMeta: Record<Platform, PlatformMeta> = {
    facebook: { icon: 'fa-brands fa-facebook-f', name: 'Facebook', color: '#1877F2' },
    instagram: { icon: 'fa-brands fa-instagram', name: 'Instagram', color: '#E1306C' },
    twitter: { icon: 'fa-brands fa-x-twitter', name: 'X (Twitter)', color: '#F2F2F2' },
    linkedin: { icon: 'fa-brands fa-linkedin-in', name: 'LinkedIn', color: '#0A66C2' },
    youtube: { icon: 'fa-brands fa-youtube', name: 'YouTube', color: '#FF0000' },
    tiktok: { icon: 'fa-brands fa-tiktok', name: 'TikTok', color: '#000000' },
    pinterest: { icon: 'fa-brands fa-pinterest', name: 'Pinterest', color: '#E60023' },
  };

  private readonly socialAccounts = inject(SocialAccountsService);
  private readonly router = inject(Router);

  constructor() {
    super();
    this.accounts$ = this.socialAccounts.accounts$;
  }

  reconnect(account: SocialAccount): void {
    this.socialAccounts
      .reconnect(account.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({ error: (error: any) => this.loggingService.error('Reconnect failed', error, 'ConnectedAccounts') });
  }

  disconnect(account: SocialAccount): void {
    this.socialAccounts
      .disconnect(account.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({ error: (error: any) => this.loggingService.error('Disconnect failed', error, 'ConnectedAccounts') });
  }


  goToSettings(account: SocialAccount): void {
    this.router.navigate(['/dashboard/social-account/connect'], {
      queryParams: { platform: account.platform },
    });
  }

  iconFor(platform: Platform): string {
    return this.platformMeta[platform]?.icon ?? 'fa-solid fa-link';
  }

  platformName(platform: Platform): string {
    return this.platformMeta[platform]?.name ?? platform;
  }

  platformColor(platform: Platform): string {
    return this.platformMeta[platform]?.color ?? '#F2F2F2';
  }
}
