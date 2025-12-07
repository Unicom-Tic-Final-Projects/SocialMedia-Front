import { Component, Input, Output, EventEmitter, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Platform } from '../../../models/social.models';
import { SocialAccountCardComponent, PlatformDefinition } from '../social-account-card/social-account-card.component';
import { SocialAccountsService } from '../../../services/client/social-accounts.service';
import { AccountConnectionService } from '../../../services/client/account-connection.service';
import { takeUntil } from 'rxjs/operators';
import { LoggingService } from '../../../core/services/logging.service';
import { BaseComponent } from '../../../core/base/base.component';

@Component({
  selector: 'app-social-account-list',
  standalone: true,
  imports: [CommonModule, SocialAccountCardComponent],
  templateUrl: './social-account-list.component.html',
  styleUrl: './social-account-list.component.css',
})
export class SocialAccountListComponent extends BaseComponent {
  private readonly socialAccountsService = inject(SocialAccountsService);
  private readonly connectionService = inject(AccountConnectionService);
  private readonly loggingService = inject(LoggingService);

  @Input({ required: true }) platforms!: PlatformDefinition[];
  @Input() profileImageErrors = new Map<Platform, boolean>();

  @Output() profileImageErrorChange = new EventEmitter<{ platform: Platform; error: boolean }>();
  @Output() disconnect = new EventEmitter<Platform>();

  readonly accounts = this.socialAccountsService.accounts;
  readonly connectingPlatform = this.connectionService.connectingPlatform;
  readonly disconnectingPlatform = this.connectionService.disconnectingPlatform;

  isConnecting(platform: Platform): boolean {
    return this.connectionService.isConnecting(platform);
  }

  isDisconnecting(platform: Platform): boolean {
    return this.connectionService.isDisconnecting(platform);
  }

  hasProfileImageError(platform: Platform): boolean {
    return this.profileImageErrors.get(platform) === true;
  }

  onConnect(platform: Platform): void {
    this.connectionService
      .connect(platform, this.platforms)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (error) => this.loggingService.error('Failed to start connection flow', error, 'SocialAccountList'),
      });
  }


  onDisconnect(platform: Platform): void {
    // This will be handled by the parent component with route access
    // For now, emit an event
    this.disconnect.emit(platform);
  }

  onManage(platform: Platform): void {
    this.connectionService.navigateToManage(platform);
  }

  onProfileImageError(event: { platform: Platform; error: boolean }): void {
    this.profileImageErrorChange.emit(event);
  }
}

