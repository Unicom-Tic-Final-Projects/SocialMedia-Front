import {
  Component,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  NgZone,
  inject,
} from '@angular/core';
import { AppHeader } from '../shared/app-header/app-header';
import { HeroSection } from './landing/hero-section/hero-section';
import { TrustSection } from './landing/trust-section/trust-section';
import { MetricsSection } from './landing/metrics-section/metrics-section';
import { FeaturesSection } from './landing/features-section/features-section';
import { TestimonialsSection } from './landing/testimonials-section/testimonials-section';
import { PricingSection } from './landing/pricing-section/pricing-section';
import { CtaBand } from './landing/cta-band/cta-band';
import { WhyOnevo } from './landing/why-onevo/why-onevo';
import { AppFooter } from '../shared/app-footer/app-footer';
import { AosService } from '../shared/services/aos.service';
import { ScrollStackService } from '../shared/services/scroll-stack.service';
import { GsapScrollService } from '../shared/services/gsap-scroll.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-landing',
  imports: [
    AppHeader,
    HeroSection,
    TrustSection,
    MetricsSection,
    FeaturesSection,
    TestimonialsSection,
    PricingSection,
    CtaBand,
    WhyOnevo,
    AppFooter,
  ],
  templateUrl: './landing.html',
  styleUrl: './landing.css',
})
export class Landing implements AfterViewInit, OnDestroy {
  @ViewChild('heroSection', { static: false }) heroSection!: ElementRef<HTMLElement>;
  @ViewChild('footerSection', { static: false }) footerSection!: ElementRef<HTMLElement>;
  @ViewChild(AppHeader, { static: false }) appHeader!: AppHeader;

  private scrollSubscription?: Subscription;
  private isLooping = false;
  private lastScrollY = 0;
  private scrollHandler = this.onScroll.bind(this);
  private sectionMap: Map<string, number> = new Map([
    ['hero', 0],
    ['features', 1],
    ['testimonials', 2],
    ['pricing', 3],
  ]);

  private aosService = inject(AosService);
  private ngZone = inject(NgZone);
  private scrollStackService = inject(ScrollStackService);
  private gsapScrollService = inject(GsapScrollService);

  ngAfterViewInit() {
    // Refresh AOS when landing page is rendered
    setTimeout(() => {
      this.aosService.refreshAos();
    }, 100);

    // Initialize GSAP ScrollTrigger animations
    setTimeout(() => {
      this.gsapScrollService.initScrollAnimations();
      this.gsapScrollService.refresh();
    }, 300);

    // Initialize scroll stack
    this.initializeScrollStack();

    // Setup infinite scroll loop
    this.setupInfiniteLoop();

    // Initial nav update
    setTimeout(() => {
      this.updateActiveNavItem();
    }, 500);
  }

  ngOnDestroy() {
    this.scrollSubscription?.unsubscribe();
    window.removeEventListener('scroll', this.scrollHandler);
    this.gsapScrollService.ngOnDestroy();
  }

  private initializeScrollStack() {
    // Normal scrolling with infinite loop
    setTimeout(() => {
      // Subscribe to scroll events for nav updates and infinite loop
      this.scrollSubscription = this.scrollStackService.scroll$.subscribe(() => {
        this.updateActiveNavItem();
        this.handleInfiniteLoop();
      });

      // Also listen to native scroll events as fallback
      this.ngZone.runOutsideAngular(() => {
        window.addEventListener('scroll', this.scrollHandler, { passive: true });
      });

      // Initial nav update
      this.updateActiveNavItem();
    }, 200);
  }

  private onScroll() {
    this.ngZone.run(() => {
      this.handleInfiniteLoop();
    });
  }

  private setupInfiniteLoop() {
    // Infinite loop is handled in scroll subscription
  }

  private handleInfiniteLoop() {
    if (this.isLooping) return;

    const currentScrollY = window.scrollY || window.pageYOffset;
    const documentHeight = document.documentElement.scrollHeight;
    const windowHeight = window.innerHeight;
    const maxScroll = documentHeight - windowHeight;

    // Detect if we've reached the bottom (within 10px)
    if (currentScrollY >= maxScroll - 10 && currentScrollY > this.lastScrollY) {
      this.loopToHero();
    }

    this.lastScrollY = currentScrollY;
  }

  private updateActiveNavItem(): void {
    if (!this.appHeader) return;

    const windowHeight = window.innerHeight;
    const viewportThreshold = windowHeight * 0.3; // Section is active when 30% visible

    // Find which section is most visible in the viewport
    let activeIndex = 0;
    let maxVisibility = 0;

    this.sectionMap.forEach((navIndex, sectionId) => {
      const section = document.getElementById(sectionId);
      if (section) {
        const rect = section.getBoundingClientRect();

        // Calculate how much of the section is visible in viewport
        const visibleTop = Math.max(0, -rect.top);
        const visibleBottom = Math.min(rect.height, windowHeight - rect.top);
        const visibleHeight = Math.max(0, visibleBottom - visibleTop);
        const visibilityRatio = visibleHeight / rect.height;

        // Check if section is in the upper portion of viewport (more weight)
        const isInUpperViewport = rect.top < viewportThreshold && rect.bottom > 0;

        // Calculate a score that favors sections in the upper viewport
        const score = isInUpperViewport ? visibilityRatio * 1.5 : visibilityRatio;

        if (score > maxVisibility) {
          maxVisibility = score;
          activeIndex = navIndex;
        }
      }
    });

    // Update the nav if it changed
    this.appHeader.updateActiveNavItem(activeIndex);
  }

  private loopToHero() {
    if (this.isLooping) return;

    this.isLooping = true;

    // Smoothly scroll back to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Reset looping flag after scroll completes
    setTimeout(() => {
      this.isLooping = false;
      this.lastScrollY = window.scrollY || window.pageYOffset;
    }, 1000); // Wait for smooth scroll to complete
  }
}
