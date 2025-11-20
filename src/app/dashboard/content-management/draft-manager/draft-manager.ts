import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { PostsService } from '../../../services/client/posts.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { SocialPost } from '../../../models/post.models';

@Component({
  selector: 'app-draft-manager',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './draft-manager.html',
  styleUrl: './draft-manager.css'
})
export class DraftManagerComponent implements OnInit {
  private readonly postsService = inject(PostsService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  private readonly confirmationService = inject(ConfirmationService);

  drafts = signal<SocialPost[]>([]);
  loading = signal(false);

  ngOnInit(): void {
    this.loadDrafts();
  }

  loadDrafts(): void {
    this.loading.set(true);
    
    this.postsService.getPostsByStatus('Draft').subscribe({
      next: (posts) => {
        this.drafts.set(posts);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error loading drafts:', error);
        const errorMsg = error?.error?.message || error?.message || 'Failed to load drafts. Please try again.';
        this.toastService.error(errorMsg);
        this.loading.set(false);
      }
    });
  }

  editDraft(postId: string): void {
    this.router.navigate(['/dashboard/post-editor'], {
      queryParams: { postId, edit: 'true' }
    });
  }

  deleteDraft(postId: string): void {
    this.confirmationService.confirm({
      title: 'Delete Draft',
      message: 'Are you sure you want to delete this draft? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmButtonClass: 'bg-red-500 hover:bg-red-600'
    }).then((confirmed) => {
      if (confirmed) {
        this.postsService.deletePost(postId).subscribe({
          next: () => {
            this.toastService.success('Draft deleted successfully');
            this.loadDrafts();
          },
          error: (error: HttpErrorResponse) => {
            console.error('Error deleting draft:', error);
            const errorMsg = error?.error?.message || error?.message || 'Failed to delete draft. Please try again.';
            this.toastService.error(errorMsg);
          }
        });
      }
    });
  }

  publishDraft(postId: string): void {
    this.router.navigate(['/dashboard/post-editor'], {
      queryParams: { postId, publish: 'true' }
    });
  }
}

