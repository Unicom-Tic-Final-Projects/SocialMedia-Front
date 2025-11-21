import { Injectable, NgZone } from '@angular/core';
import { fromEvent, Subject } from 'rxjs';
import { throttleTime } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ParallaxService {
  private scrollSubject = new Subject<number>();
  public scroll$ = this.scrollSubject.asObservable();

  constructor(private ngZone: NgZone) {
    this.initScrollListener();
  }

  private initScrollListener(): void {
    this.ngZone.runOutsideAngular(() => {
      fromEvent(window, 'scroll', { passive: true })
        .pipe(throttleTime(10))
        .subscribe(() => {
          const scrollY = window.scrollY || window.pageYOffset;
          this.ngZone.run(() => {
            this.scrollSubject.next(scrollY);
          });
        });
    });
  }

  getScrollY(): number {
    return window.scrollY || window.pageYOffset;
  }

  getWindowHeight(): number {
    return window.innerHeight;
  }

  getElementOffset(element: HTMLElement): number {
    return element.getBoundingClientRect().top + this.getScrollY();
  }

  calculateParallax(scrollY: number, elementOffset: number, speed: number = 0.5): number {
    const windowHeight = this.getWindowHeight();
    const elementTop = elementOffset - scrollY;
    const elementBottom = elementTop + windowHeight;
    
    if (elementBottom < 0 || elementTop > windowHeight) {
      return 0;
    }
    
    const progress = (windowHeight - elementTop) / (windowHeight * 2);
    return (progress - 0.5) * speed * 100;
  }
}

