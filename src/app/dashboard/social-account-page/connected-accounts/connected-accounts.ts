import { AsyncPipe, DatePipe, NgClass, NgIf, NgFor, TitleCasePipe } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { Platform, SocialAccount } from '../../../models/social.models';
import { SocialAccountsService } from '../../../services/client/social-accounts.service';

interface PlatformMeta {
  icon: string;
  name: string;
  color: string;
}

@Component({
  selector: 'app-connected-accounts',
  standalone: true,
  imports: [RouterModule, AsyncPipe, DatePipe, TitleCasePipe, NgIf, NgFor, NgClass],
  templateUrl: './connected-accounts.html',
  styleUrl: './connected-accounts.css',
})
export class ConnectedAccounts {
  readonly accounts$: Observable<SocialAccount[]>;

  readonly platformMeta: Record<Platform, PlatformMeta> = {
    facebook: { icon: 'fa-brands fa-facebook-f', name: 'Facebook', color: '#1877F2' },
    instagram: { icon: 'fa-brands fa-instagram', name: 'Instagram', color: '#E1306C' },
    twitter: { icon: 'fa-brands fa-x-twitter', name: 'X (Twitter)', color: '#F2F2F2' },
    linkedin: { icon: 'fa-brands fa-linkedin-in', name: 'LinkedIn', color: '#0A66C2' },
    youtube: { icon: 'fa-brands fa-youtube', name: 'YouTube', color: '#FF0000' },
    tiktok: { icon: 'fa-brands fa-tiktok', name: 'TikTok', color: '#FFFFFF' },
    pinterest: { icon: 'fa-brands fa-pinterest-p', name: 'Pinterest', color: '#E60023' },
    snapchat: { icon: 'fa-brands fa-snapchat-ghost', name: 'Snapchat', color: '#FFFC00' },
    reddit: { icon: 'fa-brands fa-reddit-alien', name: 'Reddit', color: '#FF4500' },
    threads: { icon: 'fa-brands fa-threads', name: 'Threads', color: '#F2F2F2' },
    telegram: { icon: 'fa-brands fa-telegram-plane', name: 'Telegram', color: '#229ED9' },
    whatsapp: { icon: 'fa-brands fa-whatsapp', name: 'WhatsApp', color: '#25D366' },
    discord: { icon: 'fa-brands fa-discord', name: 'Discord', color: '#5865F2' },
    tumblr: { icon: 'fa-brands fa-tumblr', name: 'Tumblr', color: '#34526F' },
    twitch: { icon: 'fa-brands fa-twitch', name: 'Twitch', color: '#9146FF' },
  };

  constructor(private readonly socialAccounts: SocialAccountsService, private readonly router: Router) {
    this.accounts$ = this.socialAccounts.accounts$;
  }

  reconnect(account: SocialAccount): void {
    this.socialAccounts
      .reconnect(account.id)
      .subscribe({ error: (error: any) => console.error('Reconnect failed', error) });
  }

  disconnect(account: SocialAccount): void {
    this.socialAccounts
      .disconnect(account.id)
      .subscribe({ error: (error: any) => console.error('Disconnect failed', error) });
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
