import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  icon?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toasts = signal<Toast[]>([]);
  private defaultDuration = 5000; // 5 seconds

  // Expose toasts signal for components
  getToastsSignal() {
    return this.toasts.asReadonly();
  }

  /**
   * Show a success toast
   */
  success(message: string, duration?: number): void {
    this.show({
      message,
      type: 'success',
      duration: duration || this.defaultDuration,
      icon: 'fa-circle-check'
    });
  }

  /**
   * Show an error toast
   */
  error(message: string, duration?: number): void {
    this.show({
      message,
      type: 'error',
      duration: duration || this.defaultDuration,
      icon: 'fa-circle-xmark'
    });
  }

  /**
   * Show a warning toast
   */
  warning(message: string, duration?: number): void {
    this.show({
      message,
      type: 'warning',
      duration: duration || this.defaultDuration,
      icon: 'fa-triangle-exclamation'
    });
  }

  /**
   * Show an info toast
   */
  info(message: string, duration?: number): void {
    this.show({
      message,
      type: 'info',
      duration: duration || this.defaultDuration,
      icon: 'fa-circle-info'
    });
  }

  /**
   * Show a custom toast
   */
  show(toast: Omit<Toast, 'id'>): void {
    const newToast: Toast = {
      id: this.generateId(),
      ...toast,
      duration: toast.duration || this.defaultDuration
    };

    // Defer signal update to next microtask to avoid change detection errors
    queueMicrotask(() => {
      this.toasts.update(toasts => [...toasts, newToast]);
    });

    // Auto-remove after duration
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        this.remove(newToast.id);
      }, newToast.duration);
    }
  }

  /**
   * Remove a toast by ID
   */
  remove(id: string): void {
    // Defer signal update to next microtask to avoid change detection errors
    queueMicrotask(() => {
      this.toasts.update(toasts => toasts.filter(t => t.id !== id));
    });
  }

  /**
   * Clear all toasts
   */
  clear(): void {
    this.toasts.set([]);
  }

  /**
   * Get current toasts
   */
  getToasts(): Toast[] {
    return this.toasts();
  }

  /**
   * Generate unique ID for toast
   */
  private generateId(): string {
    return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

