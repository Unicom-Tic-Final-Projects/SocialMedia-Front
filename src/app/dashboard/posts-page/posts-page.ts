import { DatePipe, DecimalPipe, NgClass, NgFor, NgIf } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { PostsService } from '../../services/client/posts.service';
import { SocialPost, PostStatus } from '../../models/post.models';
import { ClientsService } from '../../services/client/clients.service';
import { ClientContextService } from '../../services/client/client-context.service';
import { AuthService } from '../../core/services/auth.service';
import { Platform } from '../../models/social.models';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmationService } from '../../core/services/confirmation.service';

@Component({
  selector: 'app-posts-page',
  standalone: true,
  imports: [NgIf, NgFor, DatePipe, NgClass, DecimalPipe, FormsModule],
  templateUrl: './posts-page.html',
  styleUrl: './posts-page.css',
})
export class PostsPage implements OnInit, OnDestroy {
  private readonly postsService = inject(PostsService);
  private readonly clientsService = inject(ClientsService);
  readonly clientContextService = inject(ClientContextService); // Public for template access
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  loading = signal(true);
  posts = this.postsService.posts;
  error = this.postsService.error;

  readonly clients = this.clientsService.clients;
  readonly selectedClientId = this.clientsService.selectedClientId;
  readonly loadingClients = this.clientsService.loading;
  readonly clientsError = this.clientsService.error;
  readonly isAgency = this.authService.isAgency;
  
  // Client context
  readonly isViewingClient = this.clientContextService.isViewingClientDashboard;
  readonly selectedClient = this.clientContextService.selectedClient;

  // Search and filter
  searchQuery = signal('');
  selectedStatusFilter = signal<PostStatus | 'all'>('all');
  sortBy = signal<'title' | 'status' | 'scheduledAt'>('scheduledAt');
  sortOrder = signal<'asc' | 'desc'>('desc');

  // Status filter options
  statusFilters = [
    { value: 'all' as const, label: 'All', icon: 'fa-solid fa-list' },
    { value: 'Published' as PostStatus, label: 'Published', icon: 'fa-solid fa-check-circle' },
    { value: 'Scheduled' as PostStatus, label: 'Scheduled', icon: 'fa-solid fa-clock' },
    { value: 'Draft' as PostStatus, label: 'Draft', icon: 'fa-solid fa-edit' },
    { value: 'PendingApproval' as PostStatus, label: 'Pending', icon: 'fa-solid fa-hourglass-half' },
  ];

  // Filtered and sorted posts
  filteredPosts = computed(() => {
    let result = [...this.posts()];

    // Filter by status
    if (this.selectedStatusFilter() !== 'all') {
      result = result.filter(post => post.status === this.selectedStatusFilter());
    }

    // Filter by search query
    const query = this.searchQuery().toLowerCase().trim();
    if (query) {
      result = result.filter(post => 
        (post.title || '').toLowerCase().includes(query) ||
        (post.content || '').toLowerCase().includes(query)
      );
    }

    // Sort
    const sortBy = this.sortBy();
    const sortOrder = this.sortOrder();
    result.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortBy) {
        case 'title':
          aVal = (a.title || '').toLowerCase();
          bVal = (b.title || '').toLowerCase();
          break;
        case 'status':
          aVal = a.status;
          bVal = b.status;
          break;
        case 'scheduledAt':
          aVal = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
          bVal = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  });

  private readonly toastService = inject(ToastService);
  private readonly confirmationService = inject(ConfirmationService);
  private postsSubscription: Subscription | null = null;
  private clientsSubscription: Subscription | null = null;


  constructor() {
    effect(() => {
      const isAgency = this.authService.isAgency();
      const isViewingClient = this.clientContextService.isViewingClientDashboard();
      const clientId = isViewingClient 
        ? this.clientContextService.getCurrentClientId()
        : this.clientsService.selectedClientId();
      const selectedClient = this.clientContextService.selectedClient();

      // If viewing client dashboard, wait for client to be set
      if (isViewingClient && !selectedClient) {
        // Client not set yet, wait a bit
        return;
      }

      // If agency and not viewing a client, don't load posts
      if (isAgency && !isViewingClient && !clientId) {
        return;
      }

      // Small delay to ensure context is ready
      setTimeout(() => {
        this.loadPosts();
      }, 50);
    });
  }

  async ngOnInit(): Promise<void> {
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

    if (!this.clientsService.clients().length) {
      this.clientsSubscription = this.clientsService.loadClients().subscribe({
        error: (error) => console.error('Failed to load clients', error),
      });
    } else {
      this.loadPosts();
    }
  }

  ngOnDestroy(): void {
    this.postsSubscription?.unsubscribe();
    this.clientsSubscription?.unsubscribe();
  }

  statusClass(post: SocialPost): string {
    const statusMap: Record<PostStatus, string> = {
      Draft: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
      Scheduled: 'bg-blue-100 text-blue-800 border border-blue-300',
      Published: 'bg-green-100 text-green-800 border border-green-300',
      PendingApproval: 'bg-amber-100 text-amber-800 border border-amber-300',
      Approved: 'bg-purple-100 text-purple-800 border border-purple-300',
    };
    return statusMap[post.status] || statusMap.Draft;
  }

  getStatusIcon(status: PostStatus): string {
    const iconMap: Record<PostStatus, string> = {
      Draft: 'fa-solid fa-edit',
      Scheduled: 'fa-solid fa-clock',
      Published: 'fa-solid fa-check-circle',
      PendingApproval: 'fa-solid fa-hourglass-half',
      Approved: 'fa-solid fa-check-double',
    };
    return iconMap[status] || iconMap.Draft;
  }

  getStatusDisplay(status: PostStatus): string {
    const displayMap: Record<PostStatus, string> = {
      Draft: 'Draft',
      Scheduled: 'Scheduled',
      Published: 'Published',
      PendingApproval: 'Pending Approval',
      Approved: 'Approved',
    };
    return displayMap[status] || status;
  }

  deletePost(postId: string): void {
    this.confirmationService.confirm({
      title: 'Delete Post',
      message: 'Are you sure you want to delete this post? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmButtonClass: 'bg-red-500 hover:bg-red-600'
    }).then((confirmed) => {
      if (confirmed) {
        this.postsService.deletePost(postId).subscribe({
          next: () => {
            setTimeout(() => {
              this.toastService.success('Post deleted successfully');
            }, 0);
          },
          error: (error) => {
            console.error('Failed to delete post', error);
            setTimeout(() => {
              this.toastService.error('Failed to delete post. Please try again.');
            }, 0);
          },
        });
      }
    });
  }

  editPost(postId: string): void {
    const route = this.getPostEditorRoute();
    // Navigate to post editor with post ID as route parameter
    this.router.navigate([...route, postId]);
  }

  setStatusFilter(filter: PostStatus | 'all'): void {
    this.selectedStatusFilter.set(filter);
  }

  onSearchChange(): void {
    // Search is reactive via computed signal
  }

  toggleSort(field: 'title' | 'status' | 'scheduledAt'): void {
    if (this.sortBy() === field) {
      this.sortOrder.set(this.sortOrder() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortBy.set(field);
      this.sortOrder.set('asc');
    }
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.selectedStatusFilter.set('all');
  }

  selectClient(clientId: string): void {
    this.clientsService.setSelectedClient(clientId);
  }

  addClient(): void {
    const name = prompt('Enter client name');
    if (!name || !name.trim()) {
      return;
    }

    this.clientsService.createClient({ name: name.trim() }).subscribe({
      error: (error) => console.error('Failed to create client', error),
    });
  }

  private loadPosts(): void {
    this.loading.set(true);
    this.postsSubscription?.unsubscribe();
    this.postsSubscription = this.postsService.refreshPosts().subscribe({
      next: () => this.loading.set(false),
      error: (error) => {
        console.error('Failed to load posts', error);
        this.loading.set(false);
      },
    });
  }

  /**
   * Get the correct post editor route based on current context
   */
  getPostEditorRoute(): string[] {
    const isViewingClient = this.isViewingClient();
    const clientId = this.clientContextService.getCurrentClientId();
    
    if (isViewingClient && clientId) {
      // Agency client dashboard - navigate to client's post editor
      return ['/agency/client', clientId, 'post-editor'];
    } else {
      // Regular dashboard
      return ['/dashboard/post-editor'];
    }
  }

  /**
   * Navigate to post editor
   */
  navigateToPostEditor(): void {
    const route = this.getPostEditorRoute();
    this.router.navigate(route);
  }

}
