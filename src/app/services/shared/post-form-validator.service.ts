import { Injectable } from '@angular/core';
import { AbstractControl, FormGroup, ValidationErrors, ValidatorFn } from '@angular/forms';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Service for post form validation patterns
 * Shared across post-editor and post-creator components
 */
@Injectable({
  providedIn: 'root',
})
export class PostFormValidatorService {
  readonly MAX_CONTENT_LENGTH = 4000;
  readonly MIN_CONTENT_LENGTH = 1;

  /**
   * Validate content length
   */
  validateContentLength(content: string | null | undefined): ValidationResult {
    if (!content) {
      return { valid: true }; // Content is optional in some cases
    }

    const trimmed = content.trim();
    if (trimmed.length === 0) {
      return { valid: true }; // Empty content is valid (media-only posts)
    }

    if (trimmed.length > this.MAX_CONTENT_LENGTH) {
      return {
        valid: false,
        error: `Content exceeds maximum length of ${this.MAX_CONTENT_LENGTH} characters`,
      };
    }

    return { valid: true };
  }

  /**
   * Get character count for content
   */
  getCharacterCount(content: string | null | undefined): number {
    return content?.length || 0;
  }

  /**
   * Check if content has text
   */
  hasContent(content: string | null | undefined): boolean {
    return typeof content === 'string' && content.trim().length > 0;
  }

  /**
   * Validate form group and mark all controls as touched
   */
  validateAndMarkTouched(formGroup: FormGroup): boolean {
    if (formGroup.invalid) {
      this.markFormGroupTouched(formGroup);
      return false;
    }
    return true;
  }

  /**
   * Mark all form controls as touched
   */
  markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach((key) => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  /**
   * Custom validator for content length
   */
  contentLengthValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value || typeof value !== 'string') {
        return null; // Empty is valid
      }

      const trimmed = value.trim();
      if (trimmed.length === 0) {
        return null; // Empty is valid
      }

      if (trimmed.length > this.MAX_CONTENT_LENGTH) {
        return {
          maxLength: {
            actualLength: trimmed.length,
            maxLength: this.MAX_CONTENT_LENGTH,
          },
        };
      }

      return null;
    };
  }

  /**
   * Validate that either content or media is present
   */
  validateContentOrMedia(content: string | null | undefined, hasMedia: boolean): ValidationResult {
    const hasContent = this.hasContent(content);
    if (!hasContent && !hasMedia) {
      return {
        valid: false,
        error: 'Either content or media must be provided',
      };
    }
    return { valid: true };
  }

  /**
   * Validate scheduled date is in the future
   */
  validateScheduledDate(scheduledAt: string | null | undefined): ValidationResult {
    if (!scheduledAt) {
      return { valid: true }; // Optional
    }

    const scheduledDate = new Date(scheduledAt);
    const now = new Date();

    if (scheduledDate <= now) {
      return {
        valid: false,
        error: 'Scheduled date must be in the future',
      };
    }

    return { valid: true };
  }

  /**
   * Check if scheduled date is valid (in the future)
   */
  isScheduledDateValid(scheduledAt: string | null | undefined): boolean {
    if (!scheduledAt) {
      return false;
    }
    const scheduledDate = new Date(scheduledAt);
    const now = new Date();
    return scheduledDate > now;
  }

  /**
   * Check if scheduled date is invalid (empty or in the past)
   */
  isScheduledDateInvalid(scheduledAt: string | null | undefined): boolean {
    if (!scheduledAt) {
      return true;
    }
    const scheduledDate = new Date(scheduledAt);
    const now = new Date();
    return scheduledDate <= now;
  }
}

