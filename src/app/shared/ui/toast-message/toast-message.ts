import { Component, OnInit, OnDestroy, inject, effect, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast, ToastType } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-message',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast-message.html',
  styleUrl: './toast-message.css',
})
export class ToastMessageComponent implements OnInit, OnDestroy {
  private readonly toastService = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);
  
  toasts: Toast[] = [];

  constructor() {
    // Use effect to reactively update toasts when signal changes
    // Mark for check to handle change detection properly
    effect(() => {
      const toastsSignal = this.toastService.getToastsSignal();
      this.toasts = toastsSignal();
      // Mark for check to avoid ExpressionChangedAfterItHasBeenCheckedError
      this.cdr.markForCheck();
    });
  }

  ngOnInit(): void {
    // Initial load
    const toastsSignal = this.toastService.getToastsSignal();
    this.toasts = toastsSignal();
  }

  ngOnDestroy(): void {
    // Cleanup handled by signal subscription
  }

  removeToast(id: string): void {
    this.toastService.remove(id);
  }

  getToastClasses(type: ToastType): string {
    const baseClasses = 'flex items-start gap-3 p-4 rounded-lg shadow-lg border backdrop-blur-sm transition-all duration-300 animate-slideInRight';
    
    switch (type) {
      case 'success':
        return `${baseClasses} bg-green-50 border-green-200 text-green-800`;
      case 'error':
        return `${baseClasses} bg-red-50 border-red-200 text-red-800`;
      case 'warning':
        return `${baseClasses} bg-yellow-50 border-yellow-200 text-yellow-800`;
      case 'info':
        return `${baseClasses} bg-blue-50 border-blue-200 text-blue-800`;
      default:
        return `${baseClasses} bg-gray-50 border-gray-200 text-gray-800`;
    }
  }

  getIconClasses(type: ToastType): string {
    const baseClasses = 'fa-solid flex-shrink-0 mt-0.5';
    
    switch (type) {
      case 'success':
        return `${baseClasses} fa-circle-check text-green-600`;
      case 'error':
        return `${baseClasses} fa-circle-xmark text-red-600`;
      case 'warning':
        return `${baseClasses} fa-triangle-exclamation text-yellow-600`;
      case 'info':
        return `${baseClasses} fa-circle-info text-blue-600`;
      default:
        return `${baseClasses} fa-circle-info text-gray-600`;
    }
  }
}
