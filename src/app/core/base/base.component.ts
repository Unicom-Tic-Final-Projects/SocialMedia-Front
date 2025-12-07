import { Component, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

/**
 * Base component class that provides automatic subscription cleanup
 * All components should extend this to prevent memory leaks
 *
 * Usage:
 * ```typescript
 * export class MyComponent extends BaseComponent {
 *   constructor() {
 *     super();
 *     this.someService.getData()
 *       .pipe(takeUntil(this.destroy$))
 *       .subscribe(...);
 *   }
 * }
 * ```
 */
@Component({
  template: '',
})
export abstract class BaseComponent implements OnDestroy {
  /**
   * Subject used to signal component destruction
   * Use with takeUntil() operator to automatically unsubscribe
   */
  protected readonly destroy$ = new Subject<void>();

  /**
   * Cleanup all subscriptions when component is destroyed
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

