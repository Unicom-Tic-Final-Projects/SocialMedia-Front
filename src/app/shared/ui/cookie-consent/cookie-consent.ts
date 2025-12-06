import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CookieConsentService } from '../../../core/services/cookie-consent.service';

@Component({
  selector: 'app-cookie-consent',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './cookie-consent.html',
  styleUrl: './cookie-consent.css'
})
export class CookieConsentComponent implements OnInit {
  private readonly cookieService = inject(CookieConsentService);

  showBanner = signal(false);
  showCustomize = signal(false);

  // Cookie preferences
  functional = signal(false);
  analytics = signal(false);
  marketing = signal(false);

  ngOnInit() {
    // Show banner if user hasn't consented yet
    if (!this.cookieService.hasConsented()) {
      this.showBanner.set(true);
    } else {
      // Load existing preferences
      const prefs = this.cookieService.preferences();
      if (prefs) {
        this.functional.set(prefs.functional);
        this.analytics.set(prefs.analytics);
        this.marketing.set(prefs.marketing);
      }
    }
  }

  acceptEssential() {
    this.cookieService.acceptEssential();
    this.showBanner.set(false);
    // Reload page to apply cookie preferences
    window.location.reload();
  }

  acceptAll() {
    this.cookieService.acceptAll();
    this.showBanner.set(false);
    // Reload page to apply cookie preferences
    window.location.reload();
  }

  openCustomize() {
    this.showCustomize.set(true);
  }

  closeCustomize() {
    this.showCustomize.set(false);
  }

  saveCustomPreferences() {
    this.cookieService.saveCustomPreferences({
      functional: this.functional(),
      analytics: this.analytics(),
      marketing: this.marketing()
    });
    this.showBanner.set(false);
    this.showCustomize.set(false);
    // Reload page to apply cookie preferences
    window.location.reload();
  }

  closeBanner() {
    // Don't allow closing without accepting at least essential
    // But we can hide it temporarily (it will show again on next visit)
    this.showBanner.set(false);
  }
}

