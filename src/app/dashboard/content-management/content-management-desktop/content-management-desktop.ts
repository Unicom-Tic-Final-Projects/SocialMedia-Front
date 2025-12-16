import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError, takeUntil, distinctUntilChanged } from 'rxjs/operators';
import { PostsService } from '../../../services/client/posts.service';
import { MediaService } from '../../../services/client/media.service';
import { LoggingService } from '../../../core/services/logging.service';
import { BaseComponent } from '../../../core/base/base.component';
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
  selector: 'app-content-management-desktop',
  standalone: true,
  imports: [
    CommonModule,
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
  templateUrl: './content-management-desktop.html',
  styleUrl: './content-management-desktop.css',
})
export class ContentManagementDesktop extends BaseComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly postsService = inject(PostsService);
  private readonly mediaService = inject(MediaService);
  private readonly loggingService = inject(LoggingService);

  // Active tab
  activeTab = signal<ContentManagementTab>('create');

  // Statistics
  totalPosts = signal(0);
  draftCount = signal(0);
  scheduledCount = signal(0);
  publishedCount = signal(0);
  mediaCount = signal(0);
  loadingStats = signal(false);

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

  private loadStatistics(): void {
    this.loadingStats.set(true);

    // Load all statistics in parallel with proper error handling
    forkJoin({
      drafts: this.postsService.getPostsByStatus('Draft').pipe(
        catchError((error: HttpErrorResponse) => {
          this.loggingService.error('Error loading drafts', error, 'ContentManagementDesktop');
          return of([]);
        }),
      ),
      scheduled: this.postsService.getPostsByStatus('Scheduled').pipe(
        catchError((error: HttpErrorResponse) => {
          this.loggingService.error('Error loading scheduled posts', error, 'ContentManagementDesktop');
          return of([]);
        }),
      ),
      published: this.postsService.getPostsByStatus('Published').pipe(
        catchError((error: HttpErrorResponse) => {
          this.loggingService.error('Error loading published posts', error, 'ContentManagementDesktop');
          return of([]);
        }),
      ),
      media: this.mediaService.getMediaByTenant().pipe(
        catchError((error: HttpErrorResponse) => {
          this.loggingService.error('Error loading media', error, 'ContentManagementDesktop');
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
          this.loggingService.error('Error loading statistics', error, 'ContentManagementDesktop');
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
}
