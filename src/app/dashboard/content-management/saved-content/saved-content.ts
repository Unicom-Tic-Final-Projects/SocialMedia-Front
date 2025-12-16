import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SavedContentService, SavedCaption, SavedContentPlan } from '../../../services/client/saved-content.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ClientContextService } from '../../../services/client/client-context.service';
import { LoggingService } from '../../../core/services/logging.service';
import { BaseComponent } from '../../../core/base/base.component';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-saved-content',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './saved-content.html',
  styleUrl: './saved-content.css',
})
export class SavedContentComponent extends BaseComponent implements OnInit {
  private readonly savedContentService = inject(SavedContentService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly clientContextService = inject(ClientContextService);
  private readonly router = inject(Router);
  private readonly loggingService = inject(LoggingService);

  // Active sub-tab: 'captions' or 'content-plans'
  activeSubTab = signal<'captions' | 'content-plans'>('captions');

  // Data
  readonly savedCaptions = this.savedContentService.savedCaptions;
  readonly savedContentPlans = this.savedContentService.savedContentPlans;
  readonly loading = this.savedContentService.loading;

  // Search/filter
  searchQuery = signal<string>('');

  // Filtered data
  readonly filteredCaptions = computed(() => {
    const captions = this.savedCaptions();
    const query = this.searchQuery().toLowerCase();
    if (!query) return captions;
    return captions.filter((caption) => {
      const title = caption.title?.toLowerCase() || '';
      const description = caption.description?.toLowerCase() || '';
      const tags = caption.tags?.toLowerCase() || '';
      const captionText = caption.parsedContent?.caption?.toLowerCase() || '';
      return (
        title.includes(query) ||
        description.includes(query) ||
        tags.includes(query) ||
        captionText.includes(query)
      );
    });
  });

  readonly filteredContentPlans = computed(() => {
    const plans = this.savedContentPlans();
    const query = this.searchQuery().toLowerCase();
    if (!query) return plans;
    return plans.filter((plan) => {
      const title = plan.title?.toLowerCase() || '';
      const description = plan.description?.toLowerCase() || '';
      const tags = plan.tags?.toLowerCase() || '';
      return title.includes(query) || description.includes(query) || tags.includes(query);
    });
  });

  ngOnInit(): void {
    this.loadSavedContent();
  }

  setActiveSubTab(tab: 'captions' | 'content-plans'): void {
    this.activeSubTab.set(tab);
    this.loadSavedContent();
  }

  loadSavedContent(): void {
    const clientId = this.clientContextService.getCurrentClientId();

    if (this.activeSubTab() === 'captions') {
      this.savedContentService.loadSavedCaptions(clientId || undefined).pipe(takeUntil(this.destroy$)).subscribe({
        error: (error) => {
          this.loggingService.error('Failed to load saved captions', error, 'SavedContentComponent');
        },
      });
    } else {
      this.savedContentService.loadSavedContentPlans(clientId || undefined).pipe(takeUntil(this.destroy$)).subscribe({
        error: (error) => {
          this.loggingService.error('Failed to load saved content plans', error, 'SavedContentComponent');
        },
      });
    }
  }

  useCaption(caption: SavedCaption): void {
    let parsed = caption.parsedContent;
    
    // If parsedContent is not available, try to parse contentData
    if (!parsed && caption.contentData) {
      try {
        parsed = typeof caption.contentData === 'string' 
          ? JSON.parse(caption.contentData) 
          : caption.contentData;
      } catch (e) {
        this.loggingService.error('Failed to parse caption contentData', e, 'SavedContentComponent');
        this.toastService.error('Invalid caption data');
        return;
      }
    }
    
    if (!parsed || !parsed.caption) {
      this.toastService.error('Invalid caption data');
      return;
    }

    const fullContent = parsed.caption + ((parsed.hashtags && parsed.hashtags.length > 0) ? '\n\n' + parsed.hashtags.join(' ') : '');

    // Build query params with content
    const queryParams: any = { tab: 'create', content: encodeURIComponent(fullContent) };

    // Check if we're in agency-client context
    const clientId = this.clientContextService.getCurrentClientId();
    const isAgencyClient = this.authService.isAgency() && clientId;

    if (isAgencyClient) {
      this.router.navigate(['/agency/client', clientId, 'content-management'], { queryParams });
    } else {
      this.router.navigate(['/dashboard/content-management'], { queryParams });
    }

    // Mark as used
    this.savedContentService.useSavedContent(caption.id).pipe(takeUntil(this.destroy$)).subscribe({
      error: (error) => {
        this.loggingService.error('Failed to mark caption as used', error, 'SavedContentComponent');
      },
    });

    this.toastService.success('Navigating to create post...');
  }

  useContentPlan(plan: SavedContentPlan): void {
    let parsed = plan.parsedContent;
    
    // If parsedContent is not available, try to parse contentData
    if (!parsed && plan.contentData) {
      try {
        parsed = typeof plan.contentData === 'string' 
          ? JSON.parse(plan.contentData) 
          : plan.contentData;
      } catch (e) {
        this.loggingService.error('Failed to parse content plan contentData', e, 'SavedContentComponent');
        this.toastService.error('Invalid content plan data');
        return;
      }
    }
    
    if (!parsed || !parsed.weeklyPlans || parsed.weeklyPlans.length === 0) {
      this.toastService.error('Invalid content plan data');
      return;
    }

    // Use the first post from the first week as an example
    const firstPost = parsed.weeklyPlans[0]?.posts?.[0];
    if (!firstPost) {
      this.toastService.error('Content plan has no posts');
      return;
    }

    const fullContent =
      (firstPost.suggestedCaption || firstPost.description || '') +
      (firstPost.suggestedHashtags && firstPost.suggestedHashtags.length > 0
        ? '\n\n' + firstPost.suggestedHashtags.join(' ')
        : '');

    // Build query params with content
    const queryParams: any = { tab: 'create', content: encodeURIComponent(fullContent) };

    // Check if we're in agency-client context
    const clientId = this.clientContextService.getCurrentClientId();
    const isAgencyClient = this.authService.isAgency() && clientId;

    if (isAgencyClient) {
      this.router.navigate(['/agency/client', clientId, 'content-management'], { queryParams });
    } else {
      this.router.navigate(['/dashboard/content-management'], { queryParams });
    }

    // Mark as used
    this.savedContentService.useSavedContent(plan.id).pipe(takeUntil(this.destroy$)).subscribe({
      error: (error) => {
        this.loggingService.error('Failed to mark content plan as used', error, 'SavedContentComponent');
      },
    });

    this.toastService.success('Navigating to create post...');
  }

  deleteCaption(caption: SavedCaption): void {
    if (!confirm(`Are you sure you want to delete "${caption.title || 'this caption'}"?`)) {
      return;
    }

    this.savedContentService.deleteSavedContent(caption.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toastService.success('Caption deleted successfully');
      },
      error: (error) => {
        this.loggingService.error('Failed to delete caption', error, 'SavedContentComponent');
        const errorMsg = error?.error?.message || error?.message || 'Failed to delete caption';
        this.toastService.error(errorMsg);
      },
    });
  }

  deleteContentPlan(plan: SavedContentPlan): void {
    if (!confirm(`Are you sure you want to delete "${plan.title || 'this content plan'}"?`)) {
      return;
    }

    this.savedContentService.deleteSavedContent(plan.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toastService.success('Content plan deleted successfully');
      },
      error: (error) => {
        this.loggingService.error('Failed to delete content plan', error, 'SavedContentComponent');
        const errorMsg = error?.error?.message || error?.message || 'Failed to delete content plan';
        this.toastService.error(errorMsg);
      },
    });
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}

