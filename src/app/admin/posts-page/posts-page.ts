import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PostsService } from '../../services/admin/posts.service';

@Component({
  selector: 'app-admin-posts-page',
  imports: [CommonModule],
  templateUrl: './posts-page.html',
  styleUrl: './posts-page.css',
})
export class AdminPostsPage implements OnInit {
  posts: any[] = [];
  loading = true;

  constructor(private postsService: PostsService) {}

  ngOnInit() {
    this.loadPosts();
  }

  loadPosts() {
    this.loading = true;
    this.postsService.getPosts().subscribe({
      next: (posts) => {
        // Limit to 6 posts for display
        this.posts = posts.slice(0, 6);
        Promise.resolve().then(() => {
          this.loading = false;
        });
      },
      error: (error) => {
        console.error('Error loading posts:', error);
        Promise.resolve().then(() => {
          this.loading = false;
        });
      }
    });
  }

  deletePost(id: number) {
    if (confirm('Are you sure you want to delete this post?')) {
      this.postsService.deletePost(id).subscribe({
        next: () => {
          this.posts = this.posts.filter(post => post.id !== id);
        },
        error: (error) => {
          console.error('Error deleting post:', error);
        }
      });
    }
  }
}

