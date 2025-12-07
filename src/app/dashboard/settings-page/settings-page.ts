import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  UserSettingsService,
  UpdateUserSettingsRequest,
  UserSettingsDto,
} from '../../services/client/user-settings.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LoggingService } from '../../core/services/logging.service';
import { BaseComponent } from '../../core/base/base.component';

type SettingsTab =
  | 'appearance'
  | 'general'
  | 'posts'
  | 'notifications'
  | 'analytics'
  | 'security'
  | 'ai';

@Component({
  selector: 'app-settings-page',
  imports: [CommonModule, FormsModule],
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.css',
})
export class SettingsPage extends BaseComponent implements OnInit {
  private readonly settingsService = inject(UserSettingsService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly loggingService = inject(LoggingService);

  activeTab = signal<SettingsTab>('appearance');
  settings = signal<UserSettingsDto | null>(null);
  loading = signal(false);
  saving = signal(false);

  // Common timezones
  timezones = [
    { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'Europe/London', label: 'London (GMT)' },
    { value: 'Europe/Paris', label: 'Paris (CET)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
    { value: 'Asia/Dubai', label: 'Dubai (GST)' },
    { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
  ];

  // Available platforms
  platforms = ['Facebook', 'Instagram', 'Twitter', 'LinkedIn', 'YouTube', 'TikTok'];

  ngOnInit() {
    this.loadSettings();
  }

  setActiveTab(tab: SettingsTab) {
    this.activeTab.set(tab);
  }

  loadSettings() {
    this.loading.set(true);

    this.settingsService
      .loadSettings()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
      next: (settings) => {
        if (settings) {
          this.settings.set(settings);
        }
        this.loading.set(false);
      },
      error: (error) => {
        this.loggingService.error('Error loading settings', error, 'SettingsPage');
        this.toastService.warning('Failed to load settings. Using defaults.');
        this.loading.set(false);
      },
    });
  }

  saveSettings(updates: UpdateUserSettingsRequest) {
    this.saving.set(true);

    this.settingsService
      .updateUserSettings(updates)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
      next: (updatedSettings) => {
        this.settings.set(updatedSettings);
        this.toastService.success('Settings saved successfully!');
        this.saving.set(false);
      },
      error: (error) => {
        this.loggingService.error('Error saving settings', error, 'SettingsPage');
        this.toastService.error(
          error?.error?.message || 'Failed to save settings. Please try again.',
        );
        this.saving.set(false);
      },
    });
  }

  saveColorTheme(color: string) {
    this.saveSettings({ colorTheme: color as 'blue' | 'purple' | 'pink' });
  }

  // Helper methods for form controls
  getDefaultPlatforms(): string[] {
    const platformsStr = this.settings()?.defaultPlatforms || '[]';
    try {
      return JSON.parse(platformsStr);
    } catch {
      return [];
    }
  }

  updateDefaultPlatforms(platform: string, checked: boolean) {
    const current = this.getDefaultPlatforms();
    let updated: string[];
    if (checked) {
      updated = [...current, platform];
    } else {
      updated = current.filter((p) => p !== platform);
    }
    this.saveSettings({ defaultPlatforms: JSON.stringify(updated) });
  }

  logout() {
    this.authService.logout();
  }

}
