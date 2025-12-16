import { Component, OnInit, AfterViewInit, HostListener, ElementRef, effect, inject, signal, computed } from '@angular/core';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
  ActivatedRoute,
  NavigationEnd,
} from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { ClientContextService } from '../../services/client/client-context.service';
import { ClientsService } from '../../services/client/clients.service';

@Component({
  selector: 'app-agency-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './agency-layout.html',
  styleUrl: './agency-layout.css',
})
export class AgencyLayout implements OnInit, AfterViewInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly elementRef = inject(ElementRef);
  readonly clientContextService = inject(ClientContextService); // Public for template access
  private readonly clientsService = inject(ClientsService);

  readonly user = this.authService.user;
  readonly showMenu = signal(false);
  readonly showClientSidebar = signal(false);
  readonly isAgencySidebarCollapsed = signal(false);
  readonly showMoreMenu = signal(false);

  // Client context
  readonly selectedClient = this.clientContextService.selectedClient;
  readonly clientUser = this.clientContextService.clientUser;
  readonly clientsWithAccounts = this.clientContextService.clientsWithAccounts;

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

  // Detect if we're in client dashboard context
  readonly isClientDashboard = computed(() => this.selectedClient() !== null);

  // Bottom dock items - context aware
  readonly bottomDockItems = computed((): Array<{ route: string[]; icon: string; label: string; exact: boolean }> => {
    if (this.isClientDashboard()) {
      const clientId = this.selectedClient()?.id;
      if (!clientId) return [];
      return [
        { route: ['/agency/client', clientId, 'dashboard'], icon: 'fa-home', label: 'Home', exact: false },
        { route: ['/agency/client', clientId, 'content-management'], icon: 'fa-folder-open', label: 'Content', exact: false },
        { route: ['/agency/client', clientId, 'analytics'], icon: 'fa-chart-bar', label: 'Analytics', exact: false },
        { route: ['/agency/client', clientId, 'notifications'], icon: 'fa-bell', label: 'Alerts', exact: false },
      ];
    } else {
      return [
        { route: ['/agency'], icon: 'fa-gauge', label: 'Overview', exact: true },
        { route: ['/agency/clients'], icon: 'fa-users', label: 'Clients', exact: false },
        { route: ['/agency/team-members'], icon: 'fa-user-group', label: 'Team', exact: false },
        { route: ['/agency/tasks'], icon: 'fa-list-check', label: 'Tasks', exact: false },
      ];
    }
  });

  // More menu items - context aware
  readonly moreMenuItems = computed((): Array<{ route: string[]; icon: string; label: string }> => {
    if (this.isClientDashboard()) {
      const clientId = this.selectedClient()?.id;
      if (!clientId) return [];
      return [
        { route: ['/agency/client', clientId, 'media'], icon: 'fa-images', label: 'Media Library' },
        { route: ['/agency/client', clientId, 'social-account'], icon: 'fa-link', label: 'Social Accounts' },
        { route: ['/agency/client', clientId, 'webhooks'], icon: 'fa-webhook', label: 'Webhooks' },
        { route: ['/agency/client', clientId, 'settings'], icon: 'fa-gear', label: 'Settings' },
        { route: ['/agency/client', clientId, 'billing'], icon: 'fa-credit-card', label: 'Billing' },
        { route: ['/agency/client', clientId, 'profile'], icon: 'fa-user', label: 'Profile' },
      ];
    } else {
      return []; // No more items for agency view (all 4 main items are shown)
    }
  });

  constructor() {
    effect(() => {
      if (!this.authService.user()) {
        this.authService.loadCurrentUser().subscribe();
      }
    });

    // Load clients when user is available
    effect(() => {
      const user = this.authService.user();
      if (user) {
        this.clientsService.loadClients().subscribe();
      }
    });

    // Show client sidebar when a client is selected
    effect(() => {
      const client = this.selectedClient();
      this.showClientSidebar.set(client !== null);
      // Collapse agency sidebar when viewing client dashboard
      this.isAgencySidebarCollapsed.set(client !== null);
    });

    // Watch for route changes to set client context
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.updateClientContextFromRoute();
    });
  }

  ngOnInit(): void {
    if (!this.authService.user()) {
      this.authService.loadCurrentUser().subscribe();
    }

    // Load clients first, then check route
    this.clientsService.loadClients().subscribe({
      next: () => {
        // Wait a bit for client accounts to load
        setTimeout(() => {
          this.updateClientContextFromRoute();
        }, 100);
      },
      error: (error) => {
        console.error('Failed to load clients', error);
        // Still try to update context in case clients are already loaded
        this.updateClientContextFromRoute();
      },
    });

    // Watch for route changes
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateClientContextFromRoute();
        // Close menus on navigation
        this.showMenu.set(false);
        this.showMoreMenu.set(false);
      });
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
    if (window.innerWidth <= 1024 && e.touches[0].clientX < 20 && !this.showMenu()) {
      this.touchStartX = e.touches[0].clientX;
      this.touchStartY = e.touches[0].clientY;
    }
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(e: TouchEvent): void {
    if (window.innerWidth <= 1024) {
      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const deltaX = currentX - this.touchStartX;
      const deltaY = currentY - this.touchStartY;

      // If horizontal swipe is greater than vertical, it's a horizontal swipe
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
        // Swipe from left edge to open
        if (this.touchStartX < 20 && deltaX > 0 && !this.showMenu()) {
          e.preventDefault();
        }
        // Swipe right to close
        if (this.showMenu() && deltaX < 0) {
          e.preventDefault();
        }
      }
    }
  }

  private handleSwipe(): void {
    const deltaX = this.touchEndX - this.touchStartX;
    const deltaY = this.touchEndY - this.touchStartY;
    const threshold = this.getSwipeThreshold();

    // Check if it's a horizontal swipe
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > threshold) {
      if (deltaX > 0 && this.touchStartX < 20) {
        // Swipe right from left edge - open menu
        this.showMenu.set(true);
      } else if (deltaX < 0 && this.showMenu()) {
        // Swipe left - close menu
        this.showMenu.set(false);
      }
    }
  }

  private updateClientContextFromRoute(): void {
    // Try to get clientId from route params first
    let clientId: string | null = null;

    // Check if we're in a child route with clientId param
    const childRoute = this.route.firstChild;
    if (childRoute) {
      const params = childRoute.snapshot.params;
      if (params['clientId']) {
        clientId = params['clientId'];
      }
    }

    // Fallback to URL parsing
    if (!clientId) {
      const url = this.router.url;
      const clientMatch = url.match(/\/agency\/client\/([^/]+)/);
      if (clientMatch) {
        clientId = clientMatch[1];
      }
    }

    if (clientId) {
      const clients = this.clientsService.clients();

      // If clients aren't loaded yet, wait for them
      if (!clients || clients.length === 0) {
        this.clientsService.loadClients().subscribe({
          next: () => {
            setTimeout(() => this.setClientFromId(clientId!), 200);
          },
        });
        return;
      }

      this.setClientFromId(clientId);
    } else {
      // Not in client route, clear selection
      if (this.selectedClient()) {
        this.clientContextService.clearSelectedClient();
      }
    }
  }

  private setClientFromId(clientId: string): void {
    const clients = this.clientsService.clients();
    const client = clients.find((c) => c.id === clientId);

    if (client) {
      // Check if client has user account, if not loaded yet, load it
      if (!this.clientContextService.hasUserAccount(clientId)) {
        // Client accounts might still be loading, try to select anyway
        // The ClientContextService will handle loading
        this.clientContextService.selectClient(client);
      } else {
        this.clientContextService.selectClient(client);
      }
    } else {
      console.warn(`Client with ID ${clientId} not found`);
    }
  }

  toggleMenu(): void {
    this.showMenu.update((value) => !value);
  }

  closeMenu(): void {
    this.showMenu.set(false);
  }

  toggleMoreMenu(): void {
    this.showMoreMenu.update((value) => !value);
  }

  closeMoreMenu(): void {
    this.showMoreMenu.set(false);
  }

  navigateToMoreItem(route: string[]): void {
    this.router.navigate(route);
    this.closeMoreMenu();
  }

  // Check if route is active for bottom navigation
  isActiveRoute(route: string[]): boolean {
    const currentUrl = this.router.url;
    // Filter out null/undefined values and join
    const routePath = route.filter(r => r != null).join('/');
    
    // Handle exact match for overview
    if (routePath === '/agency') {
      return currentUrl === '/agency' || currentUrl === '/agency/';
    }
    
    // For client dashboard routes, check if URL starts with the route path
    if (routePath.includes('/agency/client/')) {
      return currentUrl.startsWith(routePath);
    }
    
    return currentUrl.startsWith(routePath);
  }

  logout(): void {
    this.authService.logout();
  }

  getTenantName(): string {
    return this.user()?.tenantName ?? 'Agency Workspace';
  }

  getUserEmail(): string {
    return this.user()?.email ?? '';
  }

  selectClient(client: any): void {
    this.clientContextService.selectClient(client);
    // Navigate to client dashboard home
    this.router.navigate(['/agency/client', client.id, 'dashboard']);
  }

  clearClientSelection(): void {
    this.clientContextService.clearSelectedClient();
    this.router.navigate(['/agency']);
  }

  getClientDisplayName(): string {
    const client = this.selectedClient();
    return client?.name || '';
  }

  getClientEmail(): string {
    const user = this.clientUser();
    return user?.email || '';
  }
}
