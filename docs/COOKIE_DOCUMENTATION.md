# Cookie and Storage Documentation

## Overview

This document describes all cookies, localStorage items, and similar storage mechanisms used by the Onevo application.

## Storage Mechanisms

### 1. localStorage (Browser Local Storage)

localStorage is used to store data that persists across browser sessions. Data is stored locally on the user's device and is not sent to the server with every request.

#### Essential Storage (Required)

| Key | Purpose | Duration | Can Disable? |
|-----|---------|----------|--------------|
| `access_token` | JWT authentication token for API requests | Until logout | No (required for authentication) |
| `refresh_token` | Token for refreshing access token | 7 days | No (required for authentication) |
| `user_data` | User profile information (JSON) | Until logout | No (required for app functionality) |

#### Functional Storage (Optional)

| Key | Purpose | Duration | Can Disable? |
|-----|---------|----------|--------------|
| `deviceId` | Unique device identifier for push notifications | Persistent | Yes (disable functional cookies) |
| `selectedClientId` | Remember selected client context (for agencies) | Session | Yes (disable functional cookies) |
| `cookieConsent` | User's cookie preference settings (JSON) | 1 year | No (required to remember preferences) |

### 2. Cookies (HTTP Cookies)

Cookies are small text files stored by the browser and sent to the server with requests.

#### Essential Cookies

Currently, our application does not set essential HTTP cookies. Authentication is handled via JWT tokens stored in localStorage and sent in the `Authorization` header.

#### Third-Party Cookies

| Service | Purpose | Type | Can Disable? |
|---------|---------|------|--------------|
| Firebase (Google) | Push notifications, analytics | Functional | Yes (disable functional cookies) |
| Stripe | Payment processing | Essential (during checkout) | No (required for payments) |
| CDN Services | Font Awesome, other resources | Functional | Yes (may affect styling) |

## Cookie Categories

### Essential Cookies (Required)

**Purpose:** Required for the website to function properly. These cannot be disabled.

**What they do:**
- Enable authentication and login
- Maintain user session
- Store user preferences
- Ensure security

**Storage Used:**
- `access_token` (localStorage)
- `refresh_token` (localStorage)
- `user_data` (localStorage)

**Impact of Disabling:** Application will not function. Users cannot log in or use core features.

---

### Functional Cookies (Optional)

**Purpose:** Enable enhanced functionality and personalization.

**What they do:**
- Enable push notifications
- Remember device preferences
- Enable enhanced features
- Store client context (for agencies)

**Storage Used:**
- `deviceId` (localStorage)
- `selectedClientId` (localStorage)
- Firebase cookies (for push notifications)

**Impact of Disabling:** 
- Push notifications will not work
- Device preferences will not be remembered
- Some enhanced features may be unavailable

**How to Disable:** Users can opt-out via the cookie consent banner.

---

### Analytics Cookies (Currently Not Active)

**Purpose:** Help us understand how visitors interact with our website.

**What they do:**
- Track page views
- Analyze user behavior
- Measure feature usage
- Generate usage statistics

**Storage Used:** None currently (may be implemented in the future)

**Impact of Disabling:** We won't be able to improve our services based on usage data.

**How to Disable:** Users can opt-out via the cookie consent banner (when implemented).

---

### Marketing Cookies (Currently Not Active)

**Purpose:** Deliver personalized advertisements and track advertising effectiveness.

**What they do:**
- Track user interests
- Deliver targeted ads
- Measure ad performance
- Enable remarketing

**Storage Used:** None currently (may be implemented in the future)

**Impact of Disabling:** Users may see less relevant advertisements.

**How to Disable:** Users can opt-out via the cookie consent banner (when implemented).

---

## Cookie Consent Management

### User Preferences

Users can manage their cookie preferences through:

1. **Cookie Consent Banner:** Shown on first visit, allows users to:
   - Accept essential cookies only
   - Accept all cookies
   - Customize preferences

2. **Browser Settings:** Users can control cookies through browser settings:
   - Chrome: Settings → Privacy and security → Cookies and other site data
   - Firefox: Options → Privacy & Security → Cookies and Site Data
   - Safari: Preferences → Privacy → Cookies and website data
   - Edge: Settings → Privacy, search, and services → Cookies

3. **Application Settings:** (Future enhancement) Allow users to manage preferences from within the app

### Preference Storage

Cookie preferences are stored in localStorage under the key `cookieConsent`:

```json
{
  "essential": true,
  "functional": false,
  "analytics": false,
  "marketing": false,
  "timestamp": "2025-12-06T10:30:00.000Z"
}
```

---

## Implementation Details

### Cookie Consent Service

The `CookieConsentService` manages cookie preferences:

- **Location:** `src/app/core/services/cookie-consent.service.ts`
- **Methods:**
  - `acceptEssential()` - Accept only essential cookies
  - `acceptAll()` - Accept all cookies
  - `saveCustomPreferences()` - Save custom preferences
  - `isCategoryAccepted()` - Check if a category is accepted
  - `revokeConsent()` - Clear all preferences

### Cookie Consent Component

The `CookieConsentComponent` displays the consent banner:

- **Location:** `src/app/shared/ui/cookie-consent/`
- **Features:**
  - Shows on first visit
  - Allows essential-only or all cookies
  - Customize option for granular control
  - Links to Privacy Policy and Cookie Policy

### Integration Points

1. **Firebase Service:** Only initializes if functional cookies are accepted
2. **Auth Service:** Always works (essential cookies required)
3. **App Component:** Checks cookie preferences before initializing features

---

## Privacy Compliance

### GDPR Compliance

- ✅ Users can opt-out of non-essential cookies
- ✅ Clear information about cookie usage
- ✅ Privacy Policy and Cookie Policy pages
- ✅ Consent is stored and respected
- ✅ Users can revoke consent at any time

### CCPA Compliance

- ✅ Users can opt-out of cookie usage
- ✅ Clear disclosure of data collection
- ✅ No sale of personal information

---

## Best Practices

1. **Always Check Preferences:** Before using any non-essential feature, check if the user has consented
2. **Respect User Choice:** Do not enable features if the user has opted out
3. **Clear Communication:** Explain what each cookie category does
4. **Easy Opt-Out:** Make it easy for users to change their preferences
5. **Regular Review:** Periodically review and update cookie usage

---

## Future Enhancements

1. **Cookie Settings Page:** Allow users to manage preferences from within the app
2. **Analytics Integration:** Implement analytics cookies with proper consent
3. **Marketing Integration:** Implement marketing cookies with proper consent
4. **Cookie Audit:** Regular audit of all cookies and storage mechanisms
5. **Automated Testing:** Test cookie consent functionality

---

## Support

For questions about cookies and storage:
- **Email:** support@onevo.com
- **Documentation:** See Privacy Policy and Cookie Policy pages

