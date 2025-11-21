import { Component, Input, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild, NgZone, QueryList, ViewChildren } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { gsap } from 'gsap';

export interface BentoCardProps {
  color?: string;
  title?: string;
  description?: string;
  label?: string;
  textAutoHide?: boolean;
  disableAnimations?: boolean;
  route?: string;
}

@Component({
  selector: 'app-magic-bento',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './magic-bento.component.html',
  styleUrl: './magic-bento.component.css',
})
export class MagicBentoComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() textAutoHide: boolean = true;
  @Input() enableStars: boolean = true;
  @Input() enableSpotlight: boolean = true;
  @Input() enableBorderGlow: boolean = true;
  @Input() disableAnimations: boolean = false;
  @Input() spotlightRadius: number = 300;
  @Input() particleCount: number = 12;
  @Input() enableTilt: boolean = true;
  @Input() glowColor: string = '76, 111, 255'; // #4C6FFF in RGB
  @Input() clickEffect: boolean = true;
  @Input() enableMagnetism: boolean = true;
  @Input() cards: BentoCardProps[] = [];

  @ViewChild('gridRef', { static: false }) gridRef!: ElementRef<HTMLDivElement>;
  @ViewChildren('cardRef') cardRefs!: QueryList<ElementRef<HTMLElement>>;

  private spotlightElement?: HTMLElement;
  private isMobile: boolean = false;
  private resizeListener?: () => void;
  private mouseMoveListener?: (e: MouseEvent) => void;
  private mouseLeaveListener?: () => void;

  private readonly DEFAULT_PARTICLE_COUNT = 12;
  private readonly DEFAULT_SPOTLIGHT_RADIUS = 300;
  private readonly MOBILE_BREAKPOINT = 768;

  constructor(
    private ngZone: NgZone,
    private router: Router
  ) {}

  ngOnInit() {
    this.checkMobile();
    this.resizeListener = () => this.checkMobile();
    window.addEventListener('resize', this.resizeListener);
  }

  ngAfterViewInit() {
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        if (this.enableSpotlight && !this.shouldDisableAnimations()) {
          this.initializeSpotlight();
        }
        this.setupCardInteractions();
      }, 100);
    });
  }

  ngOnDestroy() {
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
    }
    if (this.mouseMoveListener) {
      document.removeEventListener('mousemove', this.mouseMoveListener);
    }
    if (this.mouseLeaveListener) {
      document.removeEventListener('mouseleave', this.mouseLeaveListener);
    }
    if (this.spotlightElement) {
      this.spotlightElement.remove();
    }
  }

  private checkMobile(): void {
    this.isMobile = window.innerWidth <= this.MOBILE_BREAKPOINT;
  }

  shouldDisableAnimations(): boolean {
    return this.disableAnimations || this.isMobile;
  }

  private initializeSpotlight(): void {
    if (!this.gridRef?.nativeElement) return;

    const spotlight = document.createElement('div');
    spotlight.className = 'global-spotlight';
    spotlight.style.cssText = `
      position: fixed;
      width: 800px;
      height: 800px;
      border-radius: 50%;
      pointer-events: none;
      background: radial-gradient(circle,
        rgba(${this.glowColor}, 0.15) 0%,
        rgba(${this.glowColor}, 0.08) 15%,
        rgba(${this.glowColor}, 0.04) 25%,
        rgba(${this.glowColor}, 0.02) 40%,
        rgba(${this.glowColor}, 0.01) 65%,
        transparent 70%
      );
      z-index: 200;
      opacity: 0;
      transform: translate(-50%, -50%);
      mix-blend-mode: screen;
    `;
    document.body.appendChild(spotlight);
    this.spotlightElement = spotlight;

    this.mouseMoveListener = (e: MouseEvent) => this.handleSpotlightMove(e);
    this.mouseLeaveListener = () => this.handleSpotlightLeave();

    document.addEventListener('mousemove', this.mouseMoveListener);
    document.addEventListener('mouseleave', this.mouseLeaveListener);
  }

  private handleSpotlightMove(e: MouseEvent): void {
    if (!this.spotlightElement || !this.gridRef?.nativeElement) return;

    const section = this.gridRef.nativeElement.closest('.bento-section');
    const rect = section?.getBoundingClientRect();
    const mouseInside =
      rect && e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;

    const cards = this.gridRef.nativeElement.querySelectorAll('.card');

    if (!mouseInside) {
      gsap.to(this.spotlightElement, {
        opacity: 0,
        duration: 0.3,
        ease: 'power2.out'
      });
      cards.forEach(card => {
        (card as HTMLElement).style.setProperty('--glow-intensity', '0');
      });
      return;
    }

    const proximity = this.spotlightRadius * 0.5;
    const fadeDistance = this.spotlightRadius * 0.75;
    let minDistance = Infinity;

    cards.forEach(card => {
      const cardElement = card as HTMLElement;
      const cardRect = cardElement.getBoundingClientRect();
      const centerX = cardRect.left + cardRect.width / 2;
      const centerY = cardRect.top + cardRect.height / 2;
      const distance =
        Math.hypot(e.clientX - centerX, e.clientY - centerY) - Math.max(cardRect.width, cardRect.height) / 2;
      const effectiveDistance = Math.max(0, distance);

      minDistance = Math.min(minDistance, effectiveDistance);

      let glowIntensity = 0;
      if (effectiveDistance <= proximity) {
        glowIntensity = 1;
      } else if (effectiveDistance <= fadeDistance) {
        glowIntensity = (fadeDistance - effectiveDistance) / (fadeDistance - proximity);
      }

      this.updateCardGlowProperties(cardElement, e.clientX, e.clientY, glowIntensity, this.spotlightRadius);
    });

    gsap.to(this.spotlightElement, {
      left: e.clientX,
      top: e.clientY,
      duration: 0.1,
      ease: 'power2.out'
    });

    const targetOpacity =
      minDistance <= proximity
        ? 0.8
        : minDistance <= fadeDistance
          ? ((fadeDistance - minDistance) / (fadeDistance - proximity)) * 0.8
          : 0;

    gsap.to(this.spotlightElement, {
      opacity: targetOpacity,
      duration: targetOpacity > 0 ? 0.2 : 0.5,
      ease: 'power2.out'
    });
  }

  private handleSpotlightLeave(): void {
    if (!this.gridRef?.nativeElement) return;
    this.gridRef.nativeElement.querySelectorAll('.card').forEach(card => {
      (card as HTMLElement).style.setProperty('--glow-intensity', '0');
    });
    if (this.spotlightElement) {
      gsap.to(this.spotlightElement, {
        opacity: 0,
        duration: 0.3,
        ease: 'power2.out'
      });
    }
  }

  private updateCardGlowProperties(card: HTMLElement, mouseX: number, mouseY: number, glow: number, radius: number): void {
    const rect = card.getBoundingClientRect();
    const relativeX = ((mouseX - rect.left) / rect.width) * 100;
    const relativeY = ((mouseY - rect.top) / rect.height) * 100;

    card.style.setProperty('--glow-x', `${relativeX}%`);
    card.style.setProperty('--glow-y', `${relativeY}%`);
    card.style.setProperty('--glow-intensity', glow.toString());
    card.style.setProperty('--glow-radius', `${radius}px`);
  }

  private setupCardInteractions(): void {
    this.cardRefs.forEach((cardRef, index) => {
      const card = cardRef.nativeElement;
      if (!card) return;

      // Store card index as data attribute
      card.setAttribute('data-card-index', index.toString());

      if (this.enableStars) {
        this.setupParticleCard(card, index);
      } else {
        this.setupRegularCard(card, index);
      }
    });
  }

  private setupParticleCard(card: HTMLElement, index: number): void {
    this.setupBasicCardInteractions(card, index);
    this.setupParticles(card);
  }

  private setupParticles(card: HTMLElement): void {
    let isHovered = false;
    const particles: HTMLElement[] = [];
    const timeouts: number[] = [];

    const createParticleElement = (x: number, y: number): HTMLDivElement => {
      const el = document.createElement('div');
      el.className = 'particle';
      el.style.cssText = `
        position: absolute;
        width: 4px;
        height: 4px;
        border-radius: 50%;
        background: rgba(${this.glowColor}, 1);
        box-shadow: 0 0 6px rgba(${this.glowColor}, 0.6);
        pointer-events: none;
        z-index: 100;
        left: ${x}px;
        top: ${y}px;
      `;
      return el;
    };

    const clearAllParticles = () => {
      timeouts.forEach(clearTimeout);
      timeouts.length = 0;

      particles.forEach(particle => {
        gsap.to(particle, {
          scale: 0,
          opacity: 0,
          duration: 0.3,
          ease: 'back.in(1.7)',
          onComplete: () => {
            particle.parentNode?.removeChild(particle);
          }
        });
      });
      particles.length = 0;
    };

    const animateParticles = () => {
      if (!isHovered) return;

      const { width, height } = card.getBoundingClientRect();
      const memoizedParticles = Array.from({ length: this.particleCount }, () =>
        createParticleElement(Math.random() * width, Math.random() * height)
      );

      memoizedParticles.forEach((particle, i) => {
        const timeoutId = setTimeout(() => {
          if (!isHovered) return;

          const clone = particle.cloneNode(true) as HTMLDivElement;
          card.appendChild(clone);
          particles.push(clone);

          gsap.fromTo(clone, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.7)' });

          gsap.to(clone, {
            x: (Math.random() - 0.5) * 100,
            y: (Math.random() - 0.5) * 100,
            rotation: Math.random() * 360,
            duration: 2 + Math.random() * 2,
            ease: 'none',
            repeat: -1,
            yoyo: true
          });

          gsap.to(clone, {
            opacity: 0.3,
            duration: 1.5,
            ease: 'power2.inOut',
            repeat: -1,
            yoyo: true
          });
        }, i * 100);

        timeouts.push(timeoutId);
      });
    };

    const handleMouseEnter = () => {
      isHovered = true;
      animateParticles();
    };

    const handleMouseLeave = () => {
      isHovered = false;
      clearAllParticles();
    };

    card.addEventListener('mouseenter', handleMouseEnter);
    card.addEventListener('mouseleave', handleMouseLeave);
  }

  private setupRegularCard(card: HTMLElement, index: number): void {
    this.setupBasicCardInteractions(card, index);
  }

  private setupBasicCardInteractions(card: HTMLElement, index: number): void {
    if (this.shouldDisableAnimations()) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      if (this.enableTilt) {
        const rotateX = ((y - centerY) / centerY) * -10;
        const rotateY = ((x - centerX) / centerX) * 10;

        gsap.to(card, {
          rotateX,
          rotateY,
          duration: 0.1,
          ease: 'power2.out',
          transformPerspective: 1000
        });
      }

      if (this.enableMagnetism) {
        const magnetX = (x - centerX) * 0.05;
        const magnetY = (y - centerY) * 0.05;

        gsap.to(card, {
          x: magnetX,
          y: magnetY,
          duration: 0.3,
          ease: 'power2.out'
        });
      }
    };

    const handleMouseLeave = () => {
      if (this.enableTilt) {
        gsap.to(card, {
          rotateX: 0,
          rotateY: 0,
          duration: 0.3,
          ease: 'power2.out'
        });
      }

      if (this.enableMagnetism) {
        gsap.to(card, {
          x: 0,
          y: 0,
          duration: 0.3,
          ease: 'power2.out'
        });
      }
    };

    const handleClick = (e: MouseEvent) => {
      // Get card data
      const cardData = this.defaultCards[index];
      
      // Navigate if route is provided
      if (cardData?.route) {
        this.ngZone.run(() => {
          this.router.navigate([cardData.route]);
        });
        return;
      }

      if (!this.clickEffect) return;

      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const maxDistance = Math.max(
        Math.hypot(x, y),
        Math.hypot(x - rect.width, y),
        Math.hypot(x, y - rect.height),
        Math.hypot(x - rect.width, y - rect.height)
      );

      const ripple = document.createElement('div');
      ripple.style.cssText = `
        position: absolute;
        width: ${maxDistance * 2}px;
        height: ${maxDistance * 2}px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(${this.glowColor}, 0.4) 0%, rgba(${this.glowColor}, 0.2) 30%, transparent 70%);
        left: ${x - maxDistance}px;
        top: ${y - maxDistance}px;
        pointer-events: none;
        z-index: 1000;
      `;

      card.appendChild(ripple);

      gsap.fromTo(
        ripple,
        {
          scale: 0,
          opacity: 1
        },
        {
          scale: 1,
          opacity: 0,
          duration: 0.8,
          ease: 'power2.out',
          onComplete: () => ripple.remove()
        }
      );
    };

    card.addEventListener('mousemove', handleMouseMove);
    card.addEventListener('mouseleave', handleMouseLeave);
    card.addEventListener('click', handleClick);
  }

  get defaultCards(): BentoCardProps[] {
    if (this.cards && this.cards.length > 0) {
      return this.cards;
    }
    return [
      {
        color: '#060010',
        title: 'Analytics',
        description: 'Track user behavior',
        label: 'Insights'
      },
      {
        color: '#060010',
        title: 'Dashboard',
        description: 'Centralized data view',
        label: 'Overview'
      },
      {
        color: '#060010',
        title: 'Collaboration',
        description: 'Work together seamlessly',
        label: 'Teamwork'
      },
      {
        color: '#060010',
        title: 'Automation',
        description: 'Streamline workflows',
        label: 'Efficiency'
      },
      {
        color: '#060010',
        title: 'Integration',
        description: 'Connect favorite tools',
        label: 'Connectivity'
      },
      {
        color: '#060010',
        title: 'Security',
        description: 'Enterprise-grade protection',
        label: 'Protection'
      }
    ];
  }
}

