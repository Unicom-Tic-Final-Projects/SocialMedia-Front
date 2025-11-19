import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { PostsService } from '../../../services/client/posts.service';
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

  scheduledPosts = signal<SocialPost[]>([]);
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.loadScheduledPosts();
  }

  loadScheduledPosts(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    
    this.postsService.getPostsByStatus('Scheduled').subscribe({
      next: (posts) => {
        this.scheduledPosts.set(posts);
        this.loading.set(false);
        this.errorMessage.set(null);
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error loading scheduled posts:', error);
        const errorMsg = error?.error?.message || error?.message || 'Failed to load scheduled posts. Please try again.';
        this.errorMessage.set(errorMsg);
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
    if (confirm('Are you sure you want to cancel this scheduled post?')) {
      // TODO: Implement cancel schedule API call
      this.loadScheduledPosts();
    }
  }

  getScheduledDate(post: SocialPost): Date | null {
    return post.scheduledAt ? new Date(post.scheduledAt) : null;
  }
}

