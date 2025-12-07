import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Platform } from '../../../models/social.models';

@Component({
  selector: 'app-manual-connect-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './manual-connect-modal.component.html',
  styleUrl: './manual-connect-modal.component.css',
})
export class ManualConnectModalComponent {
  @Input() isOpen = false;
  @Input() platform: Platform | null = null;
  @Input() loading = false;
  @Input() error: string | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() submit = new EventEmitter<{
    accountId: string;
    accessToken: string;
    username?: string;
    accountName?: string;
    profilePictureUrl?: string;
  }>();

  accountId = '';
  accessToken = '';
  username = '';
  accountName = '';
  profilePictureUrl = '';

  get platformIcon(): string {
    if (this.platform === 'instagram') {
      return 'fa-brands fa-instagram';
    }
    return '';
  }

  get platformColor(): string {
    if (this.platform === 'instagram') {
      return '#E1306C';
    }
    return '';
  }

  get platformName(): string {
    if (this.platform === 'instagram') {
      return 'Instagram';
    }
    return this.platform || '';
  }

  get canSubmit(): boolean {
    return !this.loading && !!this.accountId && !!this.accessToken;
  }

  onClose(): void {
    this.reset();
    this.close.emit();
  }

  onSubmit(): void {
    if (!this.canSubmit) {
      return;
    }

    this.submit.emit({
      accountId: this.accountId,
      accessToken: this.accessToken,
      username: this.username || undefined,
      accountName: this.accountName || undefined,
      profilePictureUrl: this.profilePictureUrl || undefined,
    });
  }

  private reset(): void {
    this.accountId = '';
    this.accessToken = '';
    this.username = '';
    this.accountName = '';
    this.profilePictureUrl = '';
  }
}

