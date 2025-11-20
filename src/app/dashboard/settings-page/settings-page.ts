import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserSettingsService, UpdateUserSettingsRequest, UserSettingsDto } from '../../services/client/user-settings.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

type SettingsTab = 'appearance' | 'general' | 'posts' | 'notifications' | 'analytics' | 'security' | 'ai';

@Component({
  selector: 'app-settings-page',
  imports: [ CommonModule, FormsModule],
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.css',
})
export class SettingsPage implements OnInit {
  private readonly settingsService = inject(UserSettingsService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

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
    { value: 'Australia/Sydney', label: 'Sydney (AEST)' }
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

    this.settingsService.loadSettings().subscribe({
      next: (settings) => {
        if (settings) {
          this.settings.set(settings);
        }
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading settings:', error);
        this.toastService.warning('Failed to load settings. Using defaults.');
        this.loading.set(false);
      }
    });
  }

  saveSettings(updates: UpdateUserSettingsRequest) {
    this.saving.set(true);

    this.settingsService.updateUserSettings(updates).subscribe({
      next: (updatedSettings) => {
        this.settings.set(updatedSettings);
        this.toastService.success('Settings saved successfully!');
        this.saving.set(false);
      },
      error: (error) => {
        console.error('Error saving settings:', error);
        this.toastService.error(error?.error?.message || 'Failed to save settings. Please try again.');
        this.saving.set(false);
      }
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
      updated = current.filter(p => p !== platform);
    }
    this.saveSettings({ defaultPlatforms: JSON.stringify(updated) });
  }

  logout() {
    this.authService.logout();
  }
}
