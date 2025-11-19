import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { PostsService } from '../../../services/client/posts.service';
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

  drafts = signal<SocialPost[]>([]);
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.loadDrafts();
  }

  loadDrafts(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    
    this.postsService.getPostsByStatus('Draft').subscribe({
      next: (posts) => {
        this.drafts.set(posts);
        this.loading.set(false);
        this.errorMessage.set(null);
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error loading drafts:', error);
        const errorMsg = error?.error?.message || error?.message || 'Failed to load drafts. Please try again.';
        this.errorMessage.set(errorMsg);
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
    if (confirm('Are you sure you want to delete this draft? This action cannot be undone.')) {
      this.postsService.deletePost(postId).subscribe({
        next: () => {
          this.loadDrafts();
          this.errorMessage.set(null);
        },
        error: (error: HttpErrorResponse) => {
          console.error('Error deleting draft:', error);
          const errorMsg = error?.error?.message || error?.message || 'Failed to delete draft. Please try again.';
          this.errorMessage.set(errorMsg);
        }
      });
    }
  }

  publishDraft(postId: string): void {
    this.router.navigate(['/dashboard/post-editor'], {
      queryParams: { postId, publish: 'true' }
    });
  }
}

