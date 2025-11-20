# Toast Service Usage Guide

## Overview
The Toast Service provides a clean, non-intrusive way to display notifications throughout the application. It replaces inline error messages and alerts with elegant toast notifications.

## Basic Usage

### 1. Import the ToastService
```typescript
import { ToastService } from '../../../core/services/toast.service';

// In your component
private readonly toastService = inject(ToastService);
```

### 2. Use Toast Methods

#### Success Toast
```typescript
this.toastService.success('Operation completed successfully!');
```

#### Error Toast
```typescript
this.toastService.error('Something went wrong. Please try again.');
```

#### Warning Toast
```typescript
this.toastService.warning('Please review your input before proceeding.');
```

#### Info Toast
```typescript
this.toastService.info('Your changes have been saved.');
```

### 3. Custom Duration
```typescript
// Show for 10 seconds instead of default 5 seconds
this.toastService.success('Saved!', 10000);

// Show permanently (until manually closed)
this.toastService.error('Critical error!', 0);
```

## Examples

### Replacing Error Messages
**Before:**
```typescript
errorMessage = signal<string | null>(null);

// In error handler
this.errorMessage.set('Failed to upload file');
```

**After:**
```typescript
// In error handler
this.toastService.error('Failed to upload file');
```

### Success Notifications
```typescript
this.postsService.createPost(request).subscribe({
  next: () => {
    this.toastService.success('Post created successfully!');
    this.router.navigate(['/dashboard/posts']);
  },
  error: (error: HttpErrorResponse) => {
    this.toastService.error(error?.error?.message || 'Failed to create post');
  }
});
```

### Form Validation
```typescript
if (this.form.invalid) {
  this.toastService.warning('Please fill in all required fields');
  this.form.markAllAsTouched();
  return;
}
```

### File Upload
```typescript
this.mediaService.uploadMedia(file).subscribe({
  next: (response) => {
    this.toastService.success('File uploaded successfully!');
  },
  error: (error) => {
    this.toastService.error('Failed to upload file. Please try again.');
  }
});
```

## Toast Types

- **Success** (Green): Use for successful operations
- **Error** (Red): Use for errors and failures
- **Warning** (Yellow): Use for warnings and cautions
- **Info** (Blue): Use for informational messages

## Best Practices

1. **Be Specific**: Provide clear, actionable messages
   - ❌ `this.toastService.error('Error');`
   - ✅ `this.toastService.error('Failed to save post. Please check your connection and try again.');`

2. **Use Appropriate Types**: Match the toast type to the message
   - Success for completed actions
   - Error for failures
   - Warning for potential issues
   - Info for general information

3. **Remove Inline Error Displays**: Remove `errorMessage` signals and inline error divs from templates

4. **Keep Messages Concise**: Toast messages should be brief but informative

## Migration Checklist

For each component:
- [ ] Import `ToastService`
- [ ] Inject `ToastService` in constructor
- [ ] Replace `errorMessage.set()` with `toastService.error()`
- [ ] Add `toastService.success()` for successful operations
- [ ] Remove `errorMessage` signal if no longer needed
- [ ] Remove error message display from HTML template
- [ ] Test all error and success scenarios

