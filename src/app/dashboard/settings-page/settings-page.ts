import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-settings-page',
  imports: [RouterLink],
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.css',
})
export class SettingsPage {
  isDarkMode = true;
  selectedColor = 'teal';

  toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
    // TODO: Implement theme switching logic
    console.log('Theme mode:', this.isDarkMode ? 'Dark' : 'Light');
  }

  selectColorTheme(color: string) {
    this.selectedColor = color;
    // TODO: Implement color theme switching logic
    console.log('Selected color theme:', color);
  }

  logout() {
    // TODO: Implement logout logic
    console.log('Logout clicked');
    // Example: this.authService.logout();
  }
}
