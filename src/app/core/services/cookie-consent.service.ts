import { Injectable, signal, computed } from '@angular/core';

export interface CookiePreferences {
  essential: boolean;    // Always true (required)
  functional: boolean;   // Push notifications, enhanced features
  analytics: boolean;    // Analytics tracking (not currently used)
  marketing: boolean;    // Marketing tracking (not currently used)
  timestamp: string;     // When consent was given
}

@Injectable({
  providedIn: 'root'
})
export class CookieConsentService {
  private readonly CONSENT_KEY = 'cookieConsent';
  private readonly preferencesSignal = signal<CookiePreferences | null>(this.loadPreferences());

  readonly preferences = this.preferencesSignal.asReadonly();
  readonly hasConsented = computed(() => this.preferencesSignal() !== null);
  readonly essentialAccepted = computed(() => this.preferencesSignal()?.essential ?? false);
  readonly functionalAccepted = computed(() => this.preferencesSignal()?.functional ?? false);
  readonly analyticsAccepted = computed(() => this.preferencesSignal()?.analytics ?? false);
  readonly marketingAccepted = computed(() => this.preferencesSignal()?.marketing ?? false);

  /**
   * Load cookie preferences from localStorage
   */
  private loadPreferences(): CookiePreferences | null {
    try {
      const stored = localStorage.getItem(this.CONSENT_KEY);
      if (stored) {
        return JSON.parse(stored) as CookiePreferences;
      }
    } catch (error) {
      console.error('Error loading cookie preferences:', error);
    }
    return null;
  }

  /**
   * Save cookie preferences to localStorage
   */
  private savePreferences(preferences: CookiePreferences): void {
    try {
      localStorage.setItem(this.CONSENT_KEY, JSON.stringify(preferences));
      this.preferencesSignal.set(preferences);
    } catch (error) {
      console.error('Error saving cookie preferences:', error);
    }
  }

  /**
   * Accept only essential cookies
   */
  acceptEssential(): void {
    const preferences: CookiePreferences = {
      essential: true,
      functional: false,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString()
    };
    this.savePreferences(preferences);
  }

  /**
   * Accept all cookies
   */
  acceptAll(): void {
    const preferences: CookiePreferences = {
      essential: true,
      functional: true,
      analytics: true,
      marketing: true,
      timestamp: new Date().toISOString()
    };
    this.savePreferences(preferences);
  }

  /**
   * Save custom cookie preferences
   */
  saveCustomPreferences(preferences: Partial<CookiePreferences>): void {
    const current = this.preferencesSignal() || {
      essential: true,
      functional: false,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString()
    };

    const updated: CookiePreferences = {
      ...current,
      ...preferences,
      essential: true, // Always required
      timestamp: new Date().toISOString()
    };

    this.savePreferences(updated);
  }

  /**
   * Revoke consent (clear preferences)
   */
  revokeConsent(): void {
    localStorage.removeItem(this.CONSENT_KEY);
    this.preferencesSignal.set(null);
  }

  /**
   * Check if a specific cookie category is accepted
   */
  isCategoryAccepted(category: keyof Omit<CookiePreferences, 'timestamp'>): boolean {
    const prefs = this.preferencesSignal();
    if (!prefs) return false;
    
    if (category === 'essential') return true; // Always true
    
    return prefs[category] ?? false;
  }
}

