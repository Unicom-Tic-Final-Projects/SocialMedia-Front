import { Injectable, signal, effect } from '@angular/core';
import { fromEvent } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

export type ScreenSize = 'mobile' | 'tablet' | 'desktop';

@Injectable({
  providedIn: 'root',
})
export class ScreenSizeService {
  private readonly mobileBreakpoint = 768;
  private readonly tabletBreakpoint = 1024;

  readonly screenSize = signal<ScreenSize>(this.getScreenSize());
  readonly isMobile = signal<boolean>(this.screenSize() === 'mobile');
  readonly isTablet = signal<boolean>(this.screenSize() === 'tablet');
  readonly isDesktop = signal<boolean>(this.screenSize() === 'desktop');

  constructor() {
    // Listen to window resize events
    if (typeof window !== 'undefined') {
      fromEvent(window, 'resize')
        .pipe(debounceTime(100))
        .subscribe(() => {
          this.updateScreenSize();
        });

      // Initial check
      this.updateScreenSize();
    }
  }

  private getScreenSize(): ScreenSize {
    if (typeof window === 'undefined') {
      return 'desktop'; // Default to desktop for SSR
    }

    const width = window.innerWidth;
    if (width < this.mobileBreakpoint) {
      return 'mobile';
    } else if (width < this.tabletBreakpoint) {
      return 'tablet';
    } else {
      return 'desktop';
    }
  }

  private updateScreenSize(): void {
    const newSize = this.getScreenSize();
    this.screenSize.set(newSize);
    this.isMobile.set(newSize === 'mobile');
    this.isTablet.set(newSize === 'tablet');
    this.isDesktop.set(newSize === 'desktop');
  }
}

