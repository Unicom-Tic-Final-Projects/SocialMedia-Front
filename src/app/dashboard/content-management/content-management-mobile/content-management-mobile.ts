import { Component, OnInit, inject, signal, Input } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError, takeUntil, distinctUntilChanged } from 'rxjs/operators';
import { PostsService } from '../../../services/client/posts.service';
import { MediaService } from '../../../services/client/media.service';
import { LoggingService } from '../../../core/services/logging.service';
import { AuthService } from '../../../core/services/auth.service';
import { BaseComponent } from '../../../core/base/base.component';
import { RouterLink } from '@angular/router';
import { ContentLibraryComponent } from '../content-library/content-library';
import { DraftManagerComponent } from '../draft-manager/draft-manager';
import { ScheduledPostsComponent } from '../scheduled-posts/scheduled-posts';
import { ContentCalendarComponent } from '../content-calendar/content-calendar';
import { AIAssistantComponent } from '../ai-assistant/ai-assistant';
import { SavedContentComponent } from '../saved-content/saved-content';
import { PostEditor } from '../../post-editor/post-editor';
import { PostsPage } from '../../posts-page/posts-page';
import { PublishedPostsComponent } from '../../published-posts/published-posts';

type ContentManagementTab =
  | 'create'
  | 'library'
  | 'drafts'
  | 'scheduled'
  | 'calendar'
  | 'ai-assistant'
  | 'saved-content'
  | 'posts'
  | 'published-posts';

@Component({
  selector: 'app-content-management-mobile',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ContentLibraryComponent,
    DraftManagerComponent,
    ScheduledPostsComponent,
    ContentCalendarComponent,
    AIAssistantComponent,
    SavedContentComponent,
    PostEditor,
    PostsPage,
    PublishedPostsComponent,
  ],
  templateUrl: './content-management-mobile.html',
  styleUrl: './content-management-mobile.css',
})
export class ContentManagementMobile extends BaseComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly postsService = inject(PostsService);
  private readonly mediaService = inject(MediaService);
  private readonly loggingService = inject(LoggingService);
  private readonly authService = inject(AuthService);

  // Active tab
  activeTab = signal<ContentManagementTab>('create');

  // Statistics
  totalPosts = signal(0);
  draftCount = signal(0);
  scheduledCount = signal(0);
  publishedCount = signal(0);
  mediaCount = signal(0);
  loadingStats = signal(false);

  // User menu
  showUserMenu = signal(false);
  readonly user = this.authService.user;
  readonly isAgency = this.authService.isAgency;
  readonly isIndividual = this.authService.isIndividual;

  ngOnInit(): void {
    // Load initial statistics
    this.loadStatistics();

    // Check query params for tab
    this.route.queryParams
      .pipe(
        distinctUntilChanged((prev: any, curr: any) => prev['tab'] === curr['tab']),
        takeUntil(this.destroy$)
      )
      .subscribe((params: any) => {
        if (params['tab']) {
          const tab = params['tab'] as ContentManagementTab;
          if (
            [
              'create',
              'library',
              'drafts',
              'scheduled',
              'calendar',
              'ai-assistant',
              'saved-content',
              'posts',
              'published-posts',
            ].includes(tab)
          ) {
            this.setActiveTab(tab);
          }
        }
      });
  }

  setActiveTab(tab: ContentManagementTab): void {
    this.activeTab.set(tab);
    // Update URL without reloading
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
    });
    // Reload statistics when switching tabs to keep data fresh
    if (tab === 'create' || tab === 'library') {
      this.loadStatistics();
    }
  }


  getTabLabel(tab: ContentManagementTab): string {
    const labels: Record<ContentManagementTab, string> = {
      'create': 'Create',
      'library': 'Library',
      'drafts': 'Drafts',
      'scheduled': 'Schedule',
      'calendar': 'Calendar',
      'ai-assistant': 'AI Assistant',
      'saved-content': 'Saved',
      'posts': 'Posts',
      'published-posts': 'Published',
    };
    return labels[tab] || tab;
  }

  getTabIcon(tab: ContentManagementTab): string {
    const icons: Record<ContentManagementTab, string> = {
      'create': 'fa-plus-circle',
      'library': 'fa-images',
      'drafts': 'fa-edit',
      'scheduled': 'fa-calendar-check',
      'calendar': 'fa-calendar',
      'ai-assistant': 'fa-robot',
      'saved-content': 'fa-bookmark',
      'posts': 'fa-file-alt',
      'published-posts': 'fa-check-circle',
    };
    return icons[tab] || 'fa-circle';
  }

  getTabsList(): ContentManagementTab[] {
    return ['create', 'library', 'drafts', 'scheduled', 'posts', 'published-posts', 'saved-content'];
  }

  private loadStatistics(): void {
    this.loadingStats.set(true);

    // Load all statistics in parallel with proper error handling
    forkJoin({
      drafts: this.postsService.getPostsByStatus('Draft').pipe(
        catchError((error: HttpErrorResponse) => {
          this.loggingService.error('Error loading drafts', error, 'ContentManagementMobile');
          return of([]);
        }),
      ),
      scheduled: this.postsService.getPostsByStatus('Scheduled').pipe(
        catchError((error: HttpErrorResponse) => {
          this.loggingService.error('Error loading scheduled posts', error, 'ContentManagementMobile');
          return of([]);
        }),
      ),
      published: this.postsService.getPostsByStatus('Published').pipe(
        catchError((error: HttpErrorResponse) => {
          this.loggingService.error('Error loading published posts', error, 'ContentManagementMobile');
          return of([]);
        }),
      ),
      media: this.mediaService.getMediaByTenant().pipe(
        catchError((error: HttpErrorResponse) => {
          this.loggingService.error('Error loading media', error, 'ContentManagementMobile');
          return of([]);
        }),
      ),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (results) => {
          this.draftCount.set(results.drafts.length);
          this.scheduledCount.set(results.scheduled.length);
          this.publishedCount.set(results.published.length);
          this.mediaCount.set(results.media.length);
          this.totalPosts.set(
            results.drafts.length + results.scheduled.length + results.published.length,
          );
          this.loadingStats.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.loggingService.error('Error loading statistics', error, 'ContentManagementMobile');
          // Set all to 0 on complete failure
          this.draftCount.set(0);
          this.scheduledCount.set(0);
          this.publishedCount.set(0);
          this.mediaCount.set(0);
          this.totalPosts.set(0);
          this.loadingStats.set(false);
        },
      });
  }

  toggleUserMenu(): void {
    this.showUserMenu.update((value) => !value);
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
}
