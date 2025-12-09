import { Injectable, NgZone, OnDestroy, inject } from '@angular/core';
import { Subject } from 'rxjs';
import Lenis from 'lenis';

interface Transform {
  translateY: number;
  scale: number;
  rotation: number;
  blur: number;
}

@Injectable({
  providedIn: 'root',
})
export class ScrollStackService implements OnDestroy {
  private readonly ngZone = inject(NgZone);
  private scrollSubject = new Subject<number>();
  public scroll$ = this.scrollSubject.asObservable();
  private lenis: Lenis | null = null;
  private animationFrameId: number | null = null;
  private isUpdating = false;
  private lastTransforms = new Map<number, Transform>();
  private currentTransforms = new Map<number, Transform>();
  private lerpFactor = 0.15; // Smooth interpolation factor for transforms

  constructor() {
    this.initLenis();
  }

  ngOnDestroy(): void {
    this.destroy();
  }

  private initLenis(): void {
    this.ngZone.runOutsideAngular(() => {
      this.lenis = new Lenis({
        duration: 1.2,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        touchMultiplier: 2,
        infinite: false,
        wheelMultiplier: 1,
        lerp: 0.1,
        syncTouch: true,
        syncTouchLerp: 0.075,
      });

      this.lenis.on('scroll', ({ scroll }: { scroll: number }) => {
        this.ngZone.run(() => {
          this.scrollSubject.next(scroll);
        });
      });

      const raf = (time: number) => {
        if (this.lenis) {
          this.lenis.raf(time);
        }
        this.animationFrameId = requestAnimationFrame(raf);
      };
      this.animationFrameId = requestAnimationFrame(raf);
    });
  }

  getScrollY(): number {
    return this.lenis?.scroll || window.scrollY || window.pageYOffset;
  }

  getWindowHeight(): number {
    return window.innerHeight;
  }

  getElementOffset(element: HTMLElement): number {
    const rect = element.getBoundingClientRect();
    return rect.top + this.getScrollY();
  }

  calculateProgress(scrollTop: number, start: number, end: number): number {
    if (scrollTop < start) return 0;
    if (scrollTop > end) return 1;
    return (scrollTop - start) / (end - start);
  }

  parsePercentage(value: string | number, containerHeight: number): number {
    if (typeof value === 'string' && value.includes('%')) {
      return (parseFloat(value) / 100) * containerHeight;
    }
    return parseFloat(value as string);
  }

  updateCardTransforms(
    cards: HTMLElement[],
    options: {
      itemScale?: number;
      itemStackDistance?: number;
      stackPosition?: string | number;
      scaleEndPosition?: string | number;
      baseScale?: number;
      rotationAmount?: number;
      blurAmount?: number;
    } = {},
  ): void {
    if (!cards.length || this.isUpdating) return;

    this.isUpdating = true;

    // Keep cards fixed - no transforms applied
    cards.forEach((card, i) => {
      if (!card) return;

      // Reset all transforms to keep cards fixed
      card.style.transform = 'translate3d(0, 0, 0) scale(1) rotate(0deg)';
      card.style.filter = '';

      // Still track which card is in view for active state
      const scrollTop = this.getScrollY();
      const cardTop = this.getElementOffset(card);
      const containerHeight = this.getWindowHeight();
      const viewportThreshold = containerHeight * 0.3; // 30% from top

      const cardRect = card.getBoundingClientRect();
      const isInViewport = cardRect.top < viewportThreshold && cardRect.bottom > 0;

      if (isInViewport) {
        card.classList.add('stack-card-active');
      } else {
        card.classList.remove('stack-card-active');
      }
    });

    this.isUpdating = false;
  }

  initializeStackCards(cards: HTMLElement[], itemDistance: number = 100): void {
    cards.forEach((card, i) => {
      if (i < cards.length - 1) {
        card.style.marginBottom = `${itemDistance}px`;
      }
      // Keep cards fixed - no transform animations needed
      card.style.willChange = 'auto';
      card.style.transform = 'none';
      card.style.filter = '';
      card.style.transition = 'none';

      // Initialize current transforms (for compatibility)
      this.currentTransforms.set(i, {
        translateY: 0,
        scale: 1,
        rotation: 0,
        blur: 0,
      });
    });
  }

  /**
   * Update content fade-in animations for elements inside cards
   */
  updateContentAnimations(
    cards: HTMLElement[],
    options: {
      fadeStartOffset?: number; // Distance from viewport top to start fade (default: 20% of viewport)
      fadeEndOffset?: number; // Distance from viewport top to end fade (default: 10% of viewport)
      translateDistance?: number; // How far content moves up (default: 50px)
    } = {},
  ): void {
    if (!cards.length || this.isUpdating) return;

    this.isUpdating = true;

    const scrollTop = this.getScrollY();
    const containerHeight = this.getWindowHeight();
    const fadeStartOffset = options.fadeStartOffset ?? containerHeight * 0.2; // 20% from top
    const fadeEndOffset = options.fadeEndOffset ?? containerHeight * 0.1; // 10% from top
    const translateDistance = options.translateDistance ?? 50;

    cards.forEach((card) => {
      if (!card) return;

      const cardTop = this.getElementOffset(card);
      const cardHeight = card.offsetHeight;
      const cardBottom = cardTop + cardHeight;

      // Calculate when card enters animation zone
      const animationStart = cardTop - fadeStartOffset;
      const animationEnd = cardTop - fadeEndOffset;
      const animationRange = animationEnd - animationStart;

      // Find all content elements with data-scroll-fade attribute
      const contentElements = card.querySelectorAll<HTMLElement>('[data-scroll-fade]');

      if (contentElements.length === 0) {
        // If no marked elements, find the actual section/content elements
        // Angular components render as custom elements, so we need to find their content
        const sectionElements = card.querySelectorAll<HTMLElement>('section');
        
        if (sectionElements.length > 0) {
          // Animate section elements
          sectionElements.forEach((section, index) => {
            this.animateContentElement(
              section,
              scrollTop,
              animationStart,
              animationEnd,
              animationRange,
              translateDistance,
              index * 0.1, // Stagger delay
            );
          });
        } else {
          // Fallback: animate direct children (Angular components)
          const children = Array.from(card.children) as HTMLElement[];
          children.forEach((child, index) => {
            // Find the first section or main content container within the component
            const contentContainer = child.querySelector<HTMLElement>('section, [class*="content"], [class*="container"]') || child;
            this.animateContentElement(
              contentContainer,
              scrollTop,
              animationStart,
              animationEnd,
              animationRange,
              translateDistance,
              index * 0.1, // Stagger delay
            );
          });
        }
      } else {
        // Animate marked content elements
        contentElements.forEach((element, index) => {
          this.animateContentElement(
            element,
            scrollTop,
            animationStart,
            animationEnd,
            animationRange,
            translateDistance,
            index * 0.1, // Stagger delay
          );
        });
      }
    });

    this.isUpdating = false;
  }

  private animateContentElement(
    element: HTMLElement,
    scrollTop: number,
    animationStart: number,
    animationEnd: number,
    animationRange: number,
    translateDistance: number,
    staggerDelay: number = 0,
  ): void {
    // Adjust animation start/end with stagger
    const adjustedStart = animationStart + staggerDelay * animationRange;
    const adjustedEnd = animationEnd + staggerDelay * animationRange;

    // Calculate progress (0 to 1)
    let progress = this.calculateProgress(scrollTop, adjustedStart, adjustedEnd);
    progress = Math.max(0, Math.min(1, progress)); // Clamp between 0 and 1

    // Apply easing function for smooth animation
    const easedProgress = this.easeOutCubic(progress);

    // Calculate opacity and translateY
    const opacity = easedProgress;
    const translateY = (1 - easedProgress) * translateDistance;

    // Apply styles
    element.style.opacity = opacity.toString();
    element.style.transform = `translate3d(0, ${translateY}px, 0)`;
    element.style.willChange = 'opacity, transform';

    // Add/remove visible class for CSS transitions
    if (progress > 0.1) {
      element.classList.add('content-fade-visible');
    } else {
      element.classList.remove('content-fade-visible');
    }
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  scrollTo(targetY: number, options?: { immediate?: boolean }): void {
    if (this.lenis) {
      if (options?.immediate) {
        this.lenis.scrollTo(targetY, { immediate: true });
      } else {
        this.lenis.scrollTo(targetY);
      }
    } else {
      window.scrollTo({ top: targetY, behavior: options?.immediate ? 'auto' : 'smooth' });
    }
  }

  destroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.lenis) {
      this.lenis.destroy();
      this.lenis = null;
    }
  }
}
