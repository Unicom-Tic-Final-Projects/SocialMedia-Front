import { Injectable, signal } from '@angular/core';

export interface ConfirmationOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonClass?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConfirmationService {
  private confirmation = signal<{
    options: ConfirmationOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  getConfirmation() {
    return this.confirmation.asReadonly();
  }

  /**
   * Show a confirmation dialog
   * Returns a Promise that resolves to true if confirmed, false if cancelled
   */
  confirm(options: ConfirmationOptions): Promise<boolean> {
    return new Promise((resolve) => {
      this.confirmation.set({
        options: {
          title: options.title || 'Confirm Action',
          message: options.message,
          confirmText: options.confirmText || 'Confirm',
          cancelText: options.cancelText || 'Cancel',
          confirmButtonClass: options.confirmButtonClass || 'bg-[#4C6FFF] hover:bg-[#3A56CC]'
        },
        resolve
      });
    });
  }

  /**
   * Handle confirmation result
   */
  handleResult(result: boolean): void {
    const confirmation = this.confirmation();
    if (confirmation) {
      confirmation.resolve(result);
      this.confirmation.set(null);
    }
  }
}

