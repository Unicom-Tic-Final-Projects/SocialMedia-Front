import { Component, OnInit, AfterViewInit, OnDestroy, inject, signal, computed, effect, ViewChildren, QueryList, ElementRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map, delay } from 'rxjs/operators';
import { PostsService } from '../../services/client/posts.service';
import { NotificationsService } from '../../services/client/notifications.service';
import { ClientContextService } from '../../services/client/client-context.service';
import { SocialPost, PostStatus } from '../../models/post.models';
import { NotificationItem } from '../../models/social.models';
import { gsap } from 'gsap';

interface DashboardStats {
  totalPosts: number;
  published: number;
  pending: number;
  drafts: number;
}

@Component({
  selector: 'app-dashboard-home',
  imports: [CommonModule],
  templateUrl: './dashboard-home.html',
  styleUrl: './dashboard-home.css',
})
export class DashboardHome implements OnInit, AfterViewInit, OnDestroy {
  private readonly postsService = inject(PostsService);
  private readonly notificationsService = inject(NotificationsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly ngZone = inject(NgZone);
  readonly clientContextService = inject(ClientContextService);

  @ViewChildren('statCard') statCards!: QueryList<ElementRef<HTMLElement>>;

  loading = signal(false);
  stats = signal<DashboardStats>({
    totalPosts: 0,
    published: 0,
    pending: 0,
    drafts: 0,
  });
  recentActivity = signal<NotificationItem[]>([]);
  
  // Client context
  readonly isViewingClient = this.clientContextService.isViewingClientDashboard;
  readonly selectedClient = this.clientContextService.selectedClient;

  private spotlightElement?: HTMLElement;
  private readonly glowColor = '76, 111, 255'; // #4C6FFF
  private readonly particleCount = 12;
  private readonly spotlightRadius = 300;
  private mouseMoveListener?: (e: MouseEvent) => void;
  private mouseLeaveListener?: () => void;
  private isMobile: boolean = false;

  constructor() {
    // Wait for client context to be ready before loading data
    effect(() => {
      const isViewing = this.isViewingClient();
      const client = this.selectedClient();
      
      // If viewing client dashboard, wait a bit for context to be fully set
      if (isViewing && client) {
        // Small delay to ensure context is ready
        setTimeout(() => {
          this.loadDashboardData();
        }, 100);
      } else if (!isViewing) {
        // Not viewing client, load immediately
        this.loadDashboardData();
      }
    });
  }

  async ngOnInit(): Promise<void> {
    this.checkMobile();
    
    // Extract clientId from route if available
    let route = this.route;
    while (route.firstChild) {
      route = route.firstChild;
    }
    
    // Check parent routes for clientId
    let parentRoute = this.route.parent;
    while (parentRoute) {
      const clientId = parentRoute.snapshot.params['clientId'];
      if (clientId) {
        await this.clientContextService.initializeFromRoute(clientId);
        break;
      }
      parentRoute = parentRoute.parent;
    }

    // If not viewing client, load immediately
    if (!this.isViewingClient()) {
      this.loadDashboardData();
    }
  }

  ngAfterViewInit() {
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        if (!this.isMobile) {
          this.initializeSpotlight();
          this.setupCardEffects();
        }
      }, 300);
    });
  }

  ngOnDestroy() {
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
    this.isMobile = window.innerWidth <= 768;
  }

  private initializeSpotlight(): void {
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
    if (!this.spotlightElement || !this.statCards.length) return;

    const cardsContainer = document.querySelector('.magic-bento-cards');
    if (!cardsContainer) return;

    const rect = cardsContainer.getBoundingClientRect();
    const mouseInside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;

    if (!mouseInside) {
      gsap.to(this.spotlightElement, {
        opacity: 0,
        duration: 0.3,
        ease: 'power2.out'
      });
      this.statCards.forEach(cardRef => {
        const card = cardRef.nativeElement;
        card.style.setProperty('--glow-intensity', '0');
      });
      return;
    }

    const proximity = this.spotlightRadius * 0.5;
    const fadeDistance = this.spotlightRadius * 0.75;
    let minDistance = Infinity;

    this.statCards.forEach(cardRef => {
      const card = cardRef.nativeElement;
      const cardRect = card.getBoundingClientRect();
      const centerX = cardRect.left + cardRect.width / 2;
      const centerY = cardRect.top + cardRect.height / 2;
      const distance = Math.hypot(e.clientX - centerX, e.clientY - centerY) - Math.max(cardRect.width, cardRect.height) / 2;
      const effectiveDistance = Math.max(0, distance);

      minDistance = Math.min(minDistance, effectiveDistance);

      let glowIntensity = 0;
      if (effectiveDistance <= proximity) {
        glowIntensity = 1;
      } else if (effectiveDistance <= fadeDistance) {
        glowIntensity = (fadeDistance - effectiveDistance) / (fadeDistance - proximity);
      }

      this.updateCardGlowProperties(card, e.clientX, e.clientY, glowIntensity, this.spotlightRadius);
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
    this.statCards.forEach(cardRef => {
      const card = cardRef.nativeElement;
      card.style.setProperty('--glow-intensity', '0');
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

  private setupCardEffects(): void {
    this.statCards.forEach((cardRef, index) => {
      const card = cardRef.nativeElement;
      if (!card) return;

      // Set initial CSS variables
      card.style.setProperty('--glow-x', '50%');
      card.style.setProperty('--glow-y', '50%');
      card.style.setProperty('--glow-intensity', '0');
      card.style.setProperty('--glow-radius', '200px');
      card.style.setProperty('--glow-color', this.glowColor);

      // Add border glow class
      card.classList.add('magic-bento-card');

      // Setup particles
      this.setupParticles(card);

      // Setup tilt and magnetism
      this.setupTiltAndMagnetism(card);

      // Setup click effect
      this.setupClickEffect(card);
    });
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

  private setupTiltAndMagnetism(card: HTMLElement): void {
    const handleMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Tilt effect
      const rotateX = ((y - centerY) / centerY) * -5;
      const rotateY = ((x - centerX) / centerX) * 5;

      gsap.to(card, {
        rotateX,
        rotateY,
        duration: 0.1,
        ease: 'power2.out',
        transformPerspective: 1000
      });

      // Magnetism effect
      const magnetX = (x - centerX) * 0.03;
      const magnetY = (y - centerY) * 0.03;

      gsap.to(card, {
        x: magnetX,
        y: magnetY,
        duration: 0.3,
        ease: 'power2.out'
      });
    };

    const handleMouseLeave = () => {
      gsap.to(card, {
        rotateX: 0,
        rotateY: 0,
        x: 0,
        y: 0,
        duration: 0.3,
        ease: 'power2.out'
      });
    };

    card.addEventListener('mousemove', handleMouseMove);
    card.addEventListener('mouseleave', handleMouseLeave);
  }

  private setupClickEffect(card: HTMLElement): void {
    const handleClick = (e: MouseEvent) => {
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

    card.addEventListener('click', handleClick);
  }

  loadDashboardData(): void {
    this.loading.set(true);

    // Fetch posts by different statuses
    const statuses: PostStatus[] = ['Draft', 'Scheduled', 'Published', 'PendingApproval', 'Approved'];
    
    const postRequests = statuses.map(status =>
      this.postsService.getPostsByStatus(status).pipe(
        catchError(() => of([] as SocialPost[]))
      )
    );

    // Fetch recent notifications
    const notificationsRequest = this.notificationsService.refresh(5).pipe(
      catchError(() => of([] as NotificationItem[]))
    );

    forkJoin({
      posts: forkJoin(postRequests),
      notifications: notificationsRequest,
    }).subscribe({
      next: ({ posts, notifications }) => {
        // Flatten all posts from different statuses
        const allPosts = posts.flat();
        
        // Calculate statistics
        const stats: DashboardStats = {
          totalPosts: allPosts.length,
          published: allPosts.filter(p => p.status === 'Published').length,
          pending: allPosts.filter(p => p.status === 'PendingApproval' || p.status === 'Scheduled').length,
          drafts: allPosts.filter(p => p.status === 'Draft').length,
        };

        this.stats.set(stats);
        this.recentActivity.set(notifications.slice(0, 5));
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading dashboard data:', error);
        this.loading.set(false);
      }
    });
  }

  getSuccessRate(): number {
    const stats = this.stats();
    if (stats.totalPosts === 0) return 0;
    return Math.round((stats.published / stats.totalPosts) * 100);
  }

  getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    } else if (diffInSeconds < 172800) {
      return 'Yesterday';
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    }
  }

  getActivityIcon(type: string): string {
    switch (type) {
      case 'comment':
        return 'fa-comment';
      case 'mention':
        return 'fa-at';
      case 'system':
        return 'fa-bell';
      default:
        return 'fa-info-circle';
    }
  }

  getActivityMessage(notification: NotificationItem): string {
    return notification.message || notification.source;
  }
}
