import { DatePipe, DecimalPipe, NgClass, NgFor, NgIf, TitleCasePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { PostsService } from '../../services/posts.service';
import { SocialPost } from '../../models/social.models';

@Component({
  selector: 'app-posts-page',
  standalone: true,
  imports: [NgIf, NgFor, TitleCasePipe, DatePipe, NgClass, DecimalPipe],
  templateUrl: './posts-page.html',
  styleUrl: './posts-page.css',
})
export class PostsPage implements OnInit {
  private readonly postsService = inject(PostsService);

  loading = signal(true);
  posts = this.postsService.posts;

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
    const map: Record<NonNullable<SocialPost['status']>, string> = {
      draft: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
      scheduled: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
      published: 'bg-green-500/20 text-green-300 border border-green-500/30',
      pending: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    };
    return map[post.status ?? 'draft'];
  }
}
