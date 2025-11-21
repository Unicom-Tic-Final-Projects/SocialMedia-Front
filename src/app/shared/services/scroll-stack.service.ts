import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
// @ts-ignore - Lenis doesn't have type definitions
import Lenis from 'lenis';

@Injectable({
  providedIn: 'root'
})
export class ScrollStackService implements OnDestroy {
  private scrollSubject = new Subject<number>();
  public scroll$ = this.scrollSubject.asObservable();
  private lenis: Lenis | null = null;
  private animationFrameId: number | null = null;
  private isUpdating = false;
  private lastTransforms = new Map<number, any>();
  private currentTransforms = new Map<number, any>();
  private lerpFactor = 0.15; // Smooth interpolation factor for transforms

  constructor(private ngZone: NgZone) {
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
        syncTouchLerp: 0.075
      });

      this.lenis.on('scroll', ({ scroll, limit, velocity, direction, progress }: any) => {
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
    } = {}
  ): void {
    if (!cards.length || this.isUpdating) return;

    this.isUpdating = true;

    const scrollTop = this.getScrollY();
    const containerHeight = this.getWindowHeight();
    const itemScale = options.itemScale ?? 0.03;
    const itemStackDistance = options.itemStackDistance ?? 30;
    const stackPosition = options.stackPosition ?? '20%';
    const scaleEndPosition = options.scaleEndPosition ?? '10%';
    const baseScale = options.baseScale ?? 0.85;
    const rotationAmount = options.rotationAmount ?? 0;
    const blurAmount = options.blurAmount ?? 0;

    const stackPositionPx = this.parsePercentage(stackPosition, containerHeight);
    const scaleEndPositionPx = this.parsePercentage(scaleEndPosition, containerHeight);

    const endElement = document.querySelector('.scroll-stack-end') as HTMLElement | null;
    const endElementTop = endElement ? this.getElementOffset(endElement) : 0;

    cards.forEach((card, i) => {
      if (!card) return;

      const cardTop = this.getElementOffset(card);
      const triggerStart = cardTop - stackPositionPx - itemStackDistance * i;
      const triggerEnd = cardTop - scaleEndPositionPx;
      const pinStart = cardTop - stackPositionPx - itemStackDistance * i;
      const pinEnd = endElementTop - containerHeight / 2;

      const scaleProgress = this.calculateProgress(scrollTop, triggerStart, triggerEnd);
      const targetScale = baseScale + i * itemScale;
      const scale = 1 - scaleProgress * (1 - targetScale);
      const rotation = rotationAmount ? i * rotationAmount * scaleProgress : 0;

      // Calculate which card is currently on top of the stack
      let topCardIndex = 0;
      for (let j = 0; j < cards.length; j++) {
        const jCardTop = this.getElementOffset(cards[j]);
        const jTriggerStart = jCardTop - stackPositionPx - itemStackDistance * j;
        if (scrollTop >= jTriggerStart) {
          topCardIndex = j;
        }
      }

      let blur = 0;
      if (blurAmount && i < topCardIndex) {
        const depthInStack = topCardIndex - i;
        blur = Math.max(0, depthInStack * blurAmount);
      }

      // Add/remove active class for glowing border effect
      if (i === topCardIndex) {
        card.classList.add('stack-card-active');
      } else {
        card.classList.remove('stack-card-active');
      }

      let translateY = 0;
      const isPinned = scrollTop >= pinStart && scrollTop <= pinEnd;

      if (isPinned) {
        translateY = scrollTop - cardTop + stackPositionPx + itemStackDistance * i;
      } else if (scrollTop > pinEnd) {
        translateY = pinEnd - cardTop + stackPositionPx + itemStackDistance * i;
      }

      const targetTransform = {
        translateY: translateY,
        scale: scale,
        rotation: rotation,
        blur: blur
      };

      // Get current transform (for smooth interpolation)
      const currentTransform = this.currentTransforms.get(i) || {
        translateY: 0,
        scale: 1,
        rotation: 0,
        blur: 0
      };

      // Smooth interpolation (lerp) for all transform values
      const newTransform = {
        translateY: currentTransform.translateY + (targetTransform.translateY - currentTransform.translateY) * this.lerpFactor,
        scale: currentTransform.scale + (targetTransform.scale - currentTransform.scale) * this.lerpFactor,
        rotation: currentTransform.rotation + (targetTransform.rotation - currentTransform.rotation) * this.lerpFactor,
        blur: currentTransform.blur + (targetTransform.blur - currentTransform.blur) * this.lerpFactor
      };

      // Round values for performance
      const roundedTransform = {
        translateY: Math.round(newTransform.translateY * 100) / 100,
        scale: Math.round(newTransform.scale * 1000) / 1000,
        rotation: Math.round(newTransform.rotation * 100) / 100,
        blur: Math.round(newTransform.blur * 100) / 100
      };

      // Always apply transforms for smooth animation
      const transform = `translate3d(0, ${roundedTransform.translateY}px, 0) scale(${roundedTransform.scale}) rotate(${roundedTransform.rotation}deg)`;
      const filter = roundedTransform.blur > 0 ? `blur(${roundedTransform.blur}px)` : '';

      card.style.transform = transform;
      card.style.filter = filter;

      // Update stored transforms
      this.currentTransforms.set(i, roundedTransform);
      this.lastTransforms.set(i, targetTransform);
    });

    this.isUpdating = false;
  }

  initializeStackCards(cards: HTMLElement[], itemDistance: number = 100): void {
    cards.forEach((card, i) => {
      if (i < cards.length - 1) {
        card.style.marginBottom = `${itemDistance}px`;
      }
      card.style.willChange = 'transform, filter';
      card.style.transformOrigin = 'top center';
      card.style.backfaceVisibility = 'hidden';
      card.style.transform = 'translate3d(0, 0, 0)';
      card.style.perspective = '1000px';
      card.style.transition = 'none'; // Disable CSS transitions for manual control
      
      // Initialize current transforms
      this.currentTransforms.set(i, {
        translateY: 0,
        scale: 1,
        rotation: 0,
        blur: 0
      });
    });
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
