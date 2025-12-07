import { Component, Input, Output, EventEmitter, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Platform, SocialAccount } from '../../../models/social.models';
import { SocialAccountsService } from '../../../services/client/social-accounts.service';
import { ClientContextService } from '../../../services/client/client-context.service';
import { AuthService } from '../../../core/services/auth.service';

export interface PlatformDefinition {
  value: Platform;
  name: string;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-social-account-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './social-account-card.component.html',
  styleUrl: './social-account-card.component.css',
})
export class SocialAccountCardComponent {
  private readonly router = inject(Router);
  private readonly socialAccountsService = inject(SocialAccountsService);
  private readonly clientContextService = inject(ClientContextService);
  private readonly authService = inject(AuthService);

  @Input({ required: true }) platform!: PlatformDefinition;
  @Input() connecting = false;
  @Input() disconnecting = false;
  @Input() profileImageError = false;

  @Output() connect = new EventEmitter<Platform>();
  @Output() disconnect = new EventEmitter<Platform>();
  @Output() manage = new EventEmitter<Platform>();
  @Output() profileImageErrorChange = new EventEmitter<{ platform: Platform; error: boolean }>();

  readonly isViewingClient = this.clientContextService.isViewingClientDashboard;
  readonly selectedClient = this.clientContextService.selectedClient;

  // Team member read-only view detection
  readonly isTeamMember = computed(() => {
    const user = this.authService.user();
    return (
      !!user && user.tenantType === 'Agency' && (user.role === 'Editor' || user.role === 'Admin')
    );
  });

  readonly isConnected = computed(() => {
    return this.socialAccountsService.isConnected(this.platform.value);
  });

  readonly connectedAccount = computed(() => {
    return this.socialAccountsService
      .accounts()
      .find(
        (acc) =>
          acc.platform.toLowerCase() === this.platform.value.toLowerCase() &&
          acc.status === 'connected',
      );
  });

  readonly shouldShowProfilePicture = computed(() => {
    const account = this.connectedAccount();
    return !!account?.profilePictureUrl && !this.profileImageError;
  });

  readonly shouldShowIconFallback = computed(() => {
    const account = this.connectedAccount();
    return !account?.profilePictureUrl || this.profileImageError;
  });

  readonly isReadOnly = computed(() => {
    return this.isTeamMember() && this.isViewingClient();
  });

  readonly isInstagram = computed(() => {
    return this.platform.value === 'instagram';
  });

  onConnect(): void {
    this.connect.emit(this.platform.value);
  }

  onDisconnect(): void {
    this.disconnect.emit(this.platform.value);
  }

  onManage(): void {
    this.manage.emit(this.platform.value);
  }

  onProfileImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.style.display = 'none';
    }
    this.profileImageErrorChange.emit({ platform: this.platform.value, error: true });
  }
}

