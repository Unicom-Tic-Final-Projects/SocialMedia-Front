import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../../services/admin/settings.service';

@Component({
  selector: 'app-admin-settings-page',
  imports: [CommonModule, FormsModule],
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.css',
})
export class AdminSettingsPage implements OnInit {
  generalSettings = {
    platformName: '',
    platformDescription: ''
  };
  securitySettings = {
    twoFactorAuth: false,
    emailNotifications: true
  };
  loading = true;
  saving = false;

  constructor(private settingsService: SettingsService) {}

  ngOnInit() {
    this.loadSettings();
  }

  loadSettings() {
    this.loading = true;
    this.settingsService.getGeneralSettings().subscribe({
      next: (settings) => {
        // Transform API data
        this.generalSettings = {
          platformName: settings.title || 'Onevo',
          platformDescription: settings.body || 'Social media management platform'
        };
        this.settingsService.getSecuritySettings().subscribe({
          next: (security) => {
            this.securitySettings = {
              twoFactorAuth: security.id % 2 === 0,
              emailNotifications: true
            };
            this.loading = false;
          },
          error: () => {
            this.loading = false;
          }
        });
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  saveSettings() {
    this.saving = true;
    this.settingsService.updateGeneralSettings(this.generalSettings).subscribe({
      next: () => {
        this.settingsService.updateSecuritySettings(this.securitySettings).subscribe({
          next: () => {
            this.saving = false;
            alert('Settings saved successfully!');
          },
          error: () => {
            this.saving = false;
            alert('Error saving security settings');
          }
        });
      },
      error: () => {
        this.saving = false;
        alert('Error saving general settings');
      }
    });
  }
}

