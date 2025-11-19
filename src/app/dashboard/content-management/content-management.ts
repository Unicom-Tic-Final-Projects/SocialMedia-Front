import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PostsService } from '../../services/client/posts.service';
import { MediaService } from '../../services/client/media.service';
import { ContentLibraryComponent } from './content-library/content-library';
import { DraftManagerComponent } from './draft-manager/draft-manager';
import { ScheduledPostsComponent } from './scheduled-posts/scheduled-posts';
import { ContentCalendarComponent } from './content-calendar/content-calendar';
import { AIAssistantComponent } from './ai-assistant/ai-assistant';
import { PostCreatorComponent } from './post-creator/post-creator';

type ContentManagementTab = 'create' | 'library' | 'drafts' | 'scheduled' | 'calendar' | 'ai-assistant';

@Component({
  selector: 'app-content-management',
  standalone: true,
  imports: [
    CommonModule,
    ContentLibraryComponent,
    DraftManagerComponent,
    ScheduledPostsComponent,
    ContentCalendarComponent,
    AIAssistantComponent,
    PostCreatorComponent
  ],
  templateUrl: './content-management.html',
  styleUrl: './content-management.css',
})
export class ContentManagementComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly postsService = inject(PostsService);
  private readonly mediaService = inject(MediaService);

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
    
    // Check query params for tab and media selection
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        const tab = params['tab'] as ContentManagementTab;
        if (['create', 'library', 'drafts', 'scheduled', 'calendar', 'ai-assistant'].includes(tab)) {
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
      queryParamsHandling: 'merge'
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
          console.error('Error loading drafts:', error);
          return of([]);
        })
      ),
      scheduled: this.postsService.getPostsByStatus('Scheduled').pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('Error loading scheduled posts:', error);
          return of([]);
        })
      ),
      published: this.postsService.getPostsByStatus('Published').pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('Error loading published posts:', error);
          return of([]);
        })
      ),
      media: this.mediaService.getMediaByTenant().pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('Error loading media:', error);
          return of([]);
        })
      )
    }).subscribe({
      next: (results) => {
        this.draftCount.set(results.drafts.length);
        this.scheduledCount.set(results.scheduled.length);
        this.publishedCount.set(results.published.length);
        this.mediaCount.set(results.media.length);
        this.totalPosts.set(results.drafts.length + results.scheduled.length + results.published.length);
        this.loadingStats.set(false);
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error loading statistics:', error);
        // Set all to 0 on complete failure
        this.draftCount.set(0);
        this.scheduledCount.set(0);
        this.publishedCount.set(0);
        this.mediaCount.set(0);
        this.totalPosts.set(0);
        this.loadingStats.set(false);
      }
    });
  }
}

