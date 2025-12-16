import { Component, OnInit, OnDestroy, inject, signal, effect, HostListener, ElementRef, AfterViewInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { ClientContextService } from '../../services/client/client-context.service';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { BaseComponent } from '../../core/base/base.component';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './dashboard-layout.html',
  styleUrl: './dashboard-layout.css',
})
export class DashboardLayout extends BaseComponent implements OnInit, AfterViewInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly elementRef = inject(ElementRef);
  private readonly clientContextService = inject(ClientContextService);

  // Expose auth service signals directly
  readonly user = this.authService.user;
  readonly isAgency = this.authService.isAgency;
  readonly isIndividual = this.authService.isIndividual;

  showUserMenu = signal(false);
  showMobileMenu = signal(false);
  
  // Check if we're on content management page
  readonly isContentManagement = signal(false);
  // Check if we're on notifications page
  readonly isNotifications = signal(false);

  // Swipe gesture state
  private touchStartX = 0;
  private touchStartY = 0;
  private touchEndX = 0;
  private touchEndY = 0;
  
  // Adaptive swipe threshold based on screen size
  private getSwipeThreshold(): number {
    const width = window.innerWidth;
    if (width <= 360) return 40; // Very small phones
    if (width <= 428) return 45; // Small to medium phones
    if (width <= 640) return 50; // Large phones
    return 60; // Tablets
  }

  constructor() {
    super();
    // React to user changes
    effect(() => {
      const currentUser = this.authService.user();
      if (!currentUser) {
        // If no user, try to load from API
        this.authService
          .loadCurrentUser()
          .pipe(takeUntil(this.destroy$))
          .subscribe();
      }
    });
  }

  ngOnInit(): void {
    // Load current user if not already loaded
    const currentUser = this.authService.user();
    if (!currentUser) {
      this.authService
        .loadCurrentUser()
        .pipe(takeUntil(this.destroy$))
        .subscribe();
    }
    
    // Check if we're on content management page
    this.checkContentManagementRoute();
    
    // Listen to route changes
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.checkContentManagementRoute();
      });
  }
  
  private checkContentManagementRoute(): void {
    const url = this.router.url;
    const isContentMgmt = url.includes('/content-management');
    const isNotif = url.includes('/notifications');
    this.isContentManagement.set(isContentMgmt);
    this.isNotifications.set(isNotif);
    // Hide sidebar on mobile/tablet for content management and notifications
    if (isContentMgmt || isNotif) {
      this.showMobileMenu.set(false);
    }
    // Close user menu when navigating away
    if (!isContentMgmt) {
      this.showUserMenu.set(false);
    }
  }

  ngAfterViewInit(): void {
    // Setup swipe gesture listeners for mobile
    if (window.innerWidth <= 1024) {
      this.setupSwipeGestures();
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    // Re-setup swipe gestures if switching to mobile
    if (window.innerWidth <= 1024) {
      this.setupSwipeGestures();
    }
  }

  private setupSwipeGestures(): void {
    const sidebar = this.elementRef.nativeElement.querySelector('aside');
    if (!sidebar) return;

    // Touch start
    sidebar.addEventListener('touchstart', (e: TouchEvent) => {
      this.touchStartX = e.changedTouches[0].screenX;
      this.touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    // Touch end - detect swipe
    sidebar.addEventListener('touchend', (e: TouchEvent) => {
      this.touchEndX = e.changedTouches[0].screenX;
      this.touchEndY = e.changedTouches[0].screenY;
      this.handleSwipe();
    }, { passive: true });
  }

  @HostListener('touchstart', ['$event'])
  onTouchStart(e: TouchEvent): void {
    // Don't open sidebar if user menu is open or on content management/notifications page
    if (this.showUserMenu() || this.isContentManagement() || this.isNotifications()) {
      return;
    }
    // Adaptive edge detection based on screen size
    const edgeThreshold = window.innerWidth <= 360 ? 15 : 20;
    // Detect swipe from left edge to open sidebar
    if (window.innerWidth <= 1024 && e.touches[0].clientX < edgeThreshold && !this.showMobileMenu()) {
      this.touchStartX = e.touches[0].clientX;
      this.touchStartY = e.touches[0].clientY;
    }
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(e: TouchEvent): void {
    // Don't allow swipe gestures on content management or notifications page
    if (this.isContentManagement() || this.isNotifications()) {
      return;
    }
    // Prevent default to allow smooth swipe
    if (window.innerWidth <= 1024) {
      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const deltaX = currentX - this.touchStartX;
      const deltaY = currentY - this.touchStartY;
      const edgeThreshold = window.innerWidth <= 360 ? 15 : 20;

      // If horizontal swipe is greater than vertical, it's a horizontal swipe
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
        // Swipe from left edge to open
        if (this.touchStartX < edgeThreshold && deltaX > 0 && !this.showMobileMenu()) {
          e.preventDefault();
        }
        // Swipe right to close
        if (this.showMobileMenu() && deltaX < 0) {
          e.preventDefault();
        }
      }
    }
  }

  @HostListener('touchend', ['$event'])
  onTouchEnd(e: TouchEvent): void {
    // Don't handle swipe if user menu is open or on content management/notifications page
    if (window.innerWidth <= 1024 && !this.showUserMenu() && !this.isContentManagement() && !this.isNotifications()) {
      this.touchEndX = e.changedTouches[0].clientX;
      this.touchEndY = e.changedTouches[0].clientY;
      this.handleSwipe();
    }
  }

  private handleSwipe(): void {
    // Don't handle swipe if user menu is open or on content management/notifications page
    if (this.showUserMenu() || this.isContentManagement() || this.isNotifications()) {
      return;
    }
    
    const deltaX = this.touchEndX - this.touchStartX;
    const deltaY = this.touchEndY - this.touchStartY;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);
    const swipeThreshold = this.getSwipeThreshold();
    const edgeThreshold = window.innerWidth <= 360 ? 15 : 20;

    // Check if it's a horizontal swipe (more horizontal than vertical)
    if (absDeltaX > absDeltaY && absDeltaX > swipeThreshold) {
      // Swipe from left edge to open sidebar
      if (this.touchStartX < edgeThreshold && deltaX > 0 && !this.showMobileMenu()) {
        this.showMobileMenu.set(true);
      }
      // Swipe right to close sidebar
      else if (this.showMobileMenu() && deltaX < 0) {
        this.showMobileMenu.set(false);
      }
    }
  }


  toggleUserMenu(): void {
    // Close mobile menu (sidebar) if open
    if (this.showMobileMenu()) {
      this.showMobileMenu.set(false);
    }
    // Toggle user menu
    this.showUserMenu.update((value) => !value);
  }
  
  closeUserMenu(): void {
    this.showUserMenu.set(false);
  }

  toggleMobileMenu(): void {
    this.showMobileMenu.update((value) => !value);
  }

  closeMobileMenu(): void {
    this.showMobileMenu.set(false);
  }

  logout(): void {
    this.authService.logout();
  }

  getUserDisplayName(): string {
    const user = this.user();
    if (user?.tenantName) {
      return user.tenantName;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'User';
  }

  getUserInitials(): string {
    const name = this.getUserDisplayName();
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  // Check if route is active for bottom navigation
  isActiveRoute(path: string, exact: boolean = false): boolean {
    const currentUrl = this.router.url;
    if (exact) {
      return currentUrl === path;
    }
    return currentUrl.startsWith(path);
  }

  // Navigate to create post
  navigateToCreatePost(): void {
    const queryParams = { tab: 'create' };
    const clientId = this.clientContextService.getCurrentClientId();
    const isAgencyClient = this.authService.isAgency() && clientId;

    if (isAgencyClient) {
      this.router.navigate(['/agency/client', clientId, 'content-management'], { queryParams });
    } else {
      this.router.navigate(['/dashboard/content-management'], { queryParams });
    }
    this.closeMobileMenu();
  }
}
