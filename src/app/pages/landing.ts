import { Component, AfterViewInit, OnDestroy, ViewChild, ElementRef, NgZone } from '@angular/core';
import { AppHeader } from '../shared/app-header/app-header';
import { HeroSection } from './landing/hero-section/hero-section';
import { FeaturesSection } from './landing/features-section/features-section';
import { TestimonialsSection } from './landing/testimonials-section/testimonials-section';
import { PricingSection } from './landing/pricing-section/pricing-section';
import { CtaBand } from './landing/cta-band/cta-band';
import { WhyOnevo } from './landing/why-onevo/why-onevo'
import { AppFooter } from '../shared/app-footer/app-footer';
import { AosService } from '../shared/services/aos.service';
import { ScrollStackService } from '../shared/services/scroll-stack.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-landing',
  imports: [AppHeader, HeroSection, FeaturesSection, TestimonialsSection, PricingSection, CtaBand, WhyOnevo, AppFooter],
  templateUrl: './landing.html',
  styleUrl: './landing.css',
})
export class Landing implements AfterViewInit, OnDestroy {
  @ViewChild('heroSection', { static: false }) heroSection!: ElementRef<HTMLElement>;
  @ViewChild('footerSection', { static: false }) footerSection!: ElementRef<HTMLElement>;
  @ViewChild('heroCard', { static: false }) heroCard!: ElementRef<HTMLElement>;
  @ViewChild('featuresCard', { static: false }) featuresCard!: ElementRef<HTMLElement>;
  @ViewChild('testimonialsCard', { static: false }) testimonialsCard!: ElementRef<HTMLElement>;
  @ViewChild('pricingCard', { static: false }) pricingCard!: ElementRef<HTMLElement>;
  @ViewChild('ctaCard', { static: false }) ctaCard!: ElementRef<HTMLElement>;
  @ViewChild('whyCard', { static: false }) whyCard!: ElementRef<HTMLElement>;
  @ViewChild('footerCard', { static: false }) footerCard!: ElementRef<HTMLElement>;
  @ViewChild(AppHeader, { static: false }) appHeader!: AppHeader;
  
  private scrollSubscription?: Subscription;
  private isLooping = false;
  private lastScrollY = 0;
  private stackCards: HTMLElement[] = [];
  private sectionMap: Map<string, number> = new Map([
    ['hero', 0],
    ['features', 1],
    ['testimonials', 2],
    ['pricing', 3]
  ]);

  constructor(
    private aosService: AosService,
    private ngZone: NgZone,
    private scrollStackService: ScrollStackService
  ) {}

  ngAfterViewInit() {
    // Refresh AOS when landing page is rendered
    setTimeout(() => {
      this.aosService.refreshAos();
    }, 100);
    
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
  }

  private initializeScrollStack() {
    setTimeout(() => {
      // Get all stack cards
      const cards = [
        this.heroCard,
        this.featuresCard,
        this.testimonialsCard,
        this.pricingCard,
        this.ctaCard,
        this.whyCard,
        this.footerCard
      ].filter(card => card?.nativeElement).map(card => card!.nativeElement);

      if (cards.length === 0) return;

      this.stackCards = cards;

      // Initialize cards with stack service
      this.scrollStackService.initializeStackCards(cards, 100);

      // Subscribe to scroll events and update transforms + handle infinite loop + update nav
      this.scrollSubscription = this.scrollStackService.scroll$.subscribe(() => {
        this.updateStackTransforms();
        this.handleInfiniteLoop();
        this.updateActiveNavItem();
      });

      // Initial update
      this.updateStackTransforms();
    }, 200);
  }

  private updateStackTransforms() {
    if (this.stackCards.length === 0) return;

    this.scrollStackService.updateCardTransforms(this.stackCards, {
      itemScale: 0.03,
      itemStackDistance: 30,
      stackPosition: '20%',
      scaleEndPosition: '10%',
      baseScale: 0.85,
      rotationAmount: 0,
      blurAmount: 0.5
    });
  }

  private setupInfiniteLoop() {
    // Infinite loop is handled in the scroll subscription
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
    
    const heroElement = this.heroSection?.nativeElement;
    if (!heroElement) {
      this.isLooping = false;
      return;
    }
    
    const heroTop = heroElement.getBoundingClientRect().top + window.scrollY;
    
    // Use Lenis for smooth scroll to hero
    this.scrollStackService.scrollTo(heroTop, { immediate: true });
    
    setTimeout(() => {
      this.isLooping = false;
      this.lastScrollY = this.scrollStackService.getScrollY();
    }, 100);
  }
}
