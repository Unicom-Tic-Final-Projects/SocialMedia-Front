import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { PostsService } from '../../../services/client/posts.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { SocialPost } from '../../../models/post.models';
import { takeUntil } from 'rxjs/operators';
import { LoggingService } from '../../../core/services/logging.service';
import { BaseComponent } from '../../../core/base/base.component';

@Component({
  selector: 'app-draft-manager',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './draft-manager.html',
  styleUrl: './draft-manager.css',
})
export class DraftManagerComponent extends BaseComponent implements OnInit {
  private readonly postsService = inject(PostsService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly loggingService = inject(LoggingService);

  drafts = signal<SocialPost[]>([]);
  loading = signal(false);
  expandedDraftId = signal<string | null>(null);

  ngOnInit(): void {
    this.loadDrafts();
  }

  loadDrafts(): void {
    this.loading.set(true);

    this.postsService
      .getPostsByStatus('Draft')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
      next: (posts) => {
        this.drafts.set(posts);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.loggingService.error('Error loading drafts', error, 'DraftManager');
        const errorMsg =
          error?.error?.message || error?.message || 'Failed to load drafts. Please try again.';
        this.toastService.error(errorMsg);
        this.loading.set(false);
      },
    });
  }

  toggleDraftActions(draftId: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    if (this.expandedDraftId() === draftId) {
      this.expandedDraftId.set(null);
    } else {
      this.expandedDraftId.set(draftId);
    }
  }

  editDraft(postId: string): void {
    this.expandedDraftId.set(null);
    this.router.navigate(['/dashboard/content-management'], {
      queryParams: { tab: 'create', postId, edit: 'true' },
    });
  }

  deleteDraft(postId: string): void {
    this.confirmationService
      .confirm({
        title: 'Delete Draft',
        message: 'Are you sure you want to delete this draft? This action cannot be undone.',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        confirmButtonClass: 'bg-red-500 hover:bg-red-600',
      })
      .then((confirmed) => {
        if (confirmed) {
          this.postsService
            .deletePost(postId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
            next: () => {
              this.toastService.success('Draft deleted successfully');
              this.loadDrafts();
            },
            error: (error: HttpErrorResponse) => {
              this.loggingService.error('Error deleting draft', error, 'DraftManager');
              const errorMsg =
                error?.error?.message ||
                error?.message ||
                'Failed to delete draft. Please try again.';
              this.toastService.error(errorMsg);
            },
          });
        }
      });
  }

  publishDraft(postId: string): void {
    this.expandedDraftId.set(null);
    this.router.navigate(['/dashboard/content-management'], {
      queryParams: { tab: 'create', postId, publish: 'true' },
    });
  }
}
