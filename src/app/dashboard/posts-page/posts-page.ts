import { DatePipe, DecimalPipe, NgClass, NgFor, NgIf } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PostsService } from '../../services/posts.service';
import { SocialPost, PostStatus } from '../../models/post.models';

@Component({
  selector: 'app-posts-page',
  standalone: true,
  imports: [NgIf, NgFor, DatePipe, NgClass, DecimalPipe, RouterLink],
  templateUrl: './posts-page.html',
  styleUrl: './posts-page.css',
})
export class PostsPage implements OnInit {
  private readonly postsService = inject(PostsService);

  loading = signal(true);
  posts = this.postsService.posts;
  error = this.postsService.error;

  ngOnInit(): void {
    this.postsService.refreshPosts().subscribe({
      next: () => this.loading.set(false),
      error: (error) => {
        console.error('Failed to load posts', error);
        this.loading.set(false);
      },
    });
  }

  statusClass(post: SocialPost): string {
    const statusMap: Record<PostStatus, string> = {
      'Draft': 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
      'Scheduled': 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
      'Published': 'bg-green-500/20 text-green-300 border border-green-500/30',
      'PendingApproval': 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
      'Approved': 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
    };
    return statusMap[post.status] || statusMap['Draft'];
  }

  getStatusDisplay(status: PostStatus): string {
    const displayMap: Record<PostStatus, string> = {
      'Draft': 'Draft',
      'Scheduled': 'Scheduled',
      'Published': 'Published',
      'PendingApproval': 'Pending Approval',
      'Approved': 'Approved',
    };
    return displayMap[status] || status;
  }

  deletePost(postId: string): void {
    if (confirm('Are you sure you want to delete this post?')) {
      this.postsService.deletePost(postId).subscribe({
        next: () => {
          // Post deleted, list will update automatically
        },
        error: (error) => {
          console.error('Failed to delete post', error);
        },
      });
    }
  }
}
