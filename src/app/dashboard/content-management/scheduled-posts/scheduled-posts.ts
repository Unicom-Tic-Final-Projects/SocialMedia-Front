import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { PostsService } from '../../../services/client/posts.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { SocialPost } from '../../../models/post.models';

@Component({
  selector: 'app-scheduled-posts',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './scheduled-posts.html',
  styleUrl: './scheduled-posts.css'
})
export class ScheduledPostsComponent implements OnInit {
  private readonly postsService = inject(PostsService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  private readonly confirmationService = inject(ConfirmationService);

  scheduledPosts = signal<SocialPost[]>([]);
  loading = signal(false);

  ngOnInit(): void {
    this.loadScheduledPosts();
  }

  loadScheduledPosts(): void {
    this.loading.set(true);
    
    this.postsService.getPostsByStatus('Scheduled').subscribe({
      next: (posts) => {
        this.scheduledPosts.set(posts);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error loading scheduled posts:', error);
        const errorMsg = error?.error?.message || error?.message || 'Failed to load scheduled posts. Please try again.';
        this.toastService.error(errorMsg);
        this.loading.set(false);
      }
    });
  }

  editScheduled(postId: string): void {
    this.router.navigate(['/dashboard/post-editor'], {
      queryParams: { postId, edit: 'true' }
    });
  }

  cancelSchedule(postId: string): void {
    this.confirmationService.confirm({
      title: 'Cancel Scheduled Post',
      message: 'Are you sure you want to cancel this scheduled post?',
      confirmText: 'Cancel Schedule',
      cancelText: 'Keep Scheduled',
      confirmButtonClass: 'bg-red-500 hover:bg-red-600'
    }).then((confirmed) => {
      if (confirmed) {
        // TODO: Implement cancel schedule API call
        this.toastService.success('Scheduled post cancelled');
        this.loadScheduledPosts();
      }
    });
  }

  getScheduledDate(post: SocialPost): Date | null {
    return post.scheduledAt ? new Date(post.scheduledAt) : null;
  }
}

