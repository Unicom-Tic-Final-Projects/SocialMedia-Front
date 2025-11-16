import { DatePipe, DecimalPipe, NgClass, NgFor, NgIf } from '@angular/common';
import { Component, OnDestroy, OnInit, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { PostsService } from '../../services/client/posts.service';
import { SocialPost, PostStatus } from '../../models/post.models';
import { ClientsService } from '../../services/client/clients.service';
import { ClientContextService } from '../../services/client/client-context.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-posts-page',
  standalone: true,
  imports: [NgIf, NgFor, DatePipe, NgClass, DecimalPipe],
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
      Draft: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
      Scheduled: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
      Published: 'bg-green-500/20 text-green-300 border border-green-500/30',
      PendingApproval: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
      Approved: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
    };
    return statusMap[post.status] || statusMap.Draft;
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
    if (confirm('Are you sure you want to delete this post?')) {
      this.postsService.deletePost(postId).subscribe({
        error: (error) => {
          console.error('Failed to delete post', error);
        },
      });
    }
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
