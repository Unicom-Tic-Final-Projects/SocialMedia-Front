import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { PostsService, AdminPostResponse, CreatePostRequest, UpdatePostRequest } from '../../services/admin/posts.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-admin-posts-page',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './posts-page.html',
  styleUrl: './posts-page.css',
})
export class AdminPostsPage implements OnInit {
  private postsService = inject(PostsService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  posts: AdminPostResponse[] = [];
  clients: { id: string; name: string }[] = [];
  loading = signal(true);
  showModal = signal(false);
  isEditMode = signal(false);
  editingPost: AdminPostResponse | null = null;
  saving = signal(false);
  errorMessage = signal<string | null>(null);
  
  postForm: FormGroup;

  constructor() {
    this.postForm = this.fb.group({
      clientId: ['', [Validators.required]],
      content: ['', [Validators.required, Validators.minLength(1)]],
      status: ['Draft', [Validators.required]],
      scheduledAt: ['']
    });
  }

  ngOnInit() {
    this.loadPosts();
  }

  loadPosts() {
    this.loading.set(true);
    this.posts = []; // Clear existing posts while loading
    this.postsService.getPosts().subscribe({
      next: (posts) => {
        this.loading.set(false);
        this.posts = posts.map(post => ({
          ...post,
          createdAt: post.createdAt ? new Date(post.createdAt).toISOString() : new Date().toISOString()
        }));
        
        // Extract unique clients from posts
        const uniqueClients = new Map<string, string>();
        posts.forEach(post => {
          if (post.clientId && post.clientName) {
            uniqueClients.set(post.clientId, post.clientName);
          }
        });
        this.clients = Array.from(uniqueClients.entries()).map(([id, name]) => ({ id, name }));
      },
      error: (error: any) => {
        console.error('Error loading posts:', error);
        this.loading.set(false);
        this.posts = []; // Clear posts on error
      }
    });
  }

  openCreateModal() {
    this.isEditMode.set(false);
    this.editingPost = null;
    this.errorMessage.set(null);
    this.postForm.reset({
      clientId: '',
      content: '',
      status: 'Draft',
      scheduledAt: ''
    });
    this.showModal.set(true);
  }

  openEditModal(post: AdminPostResponse) {
    this.isEditMode.set(true);
    this.editingPost = post;
    this.errorMessage.set(null);
    this.postForm.patchValue({
      clientId: post.clientId,
      content: post.content,
      status: post.status,
      scheduledAt: post.scheduledAt ? new Date(post.scheduledAt).toISOString().slice(0, 16) : ''
    });
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.postForm.reset();
    this.errorMessage.set(null);
  }

  savePost() {
    if (this.postForm.invalid) {
      this.postForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);

    const formValue = this.postForm.value;
    const currentUser = this.authService.user();
    const currentUserId = currentUser?.userId || '';
    
    if (!currentUserId) {
      this.errorMessage.set('User ID not found. Please log in again.');
      this.saving.set(false);
      return;
    }

    if (this.isEditMode() && this.editingPost) {
      // Update post
      const updateRequest: UpdatePostRequest = {
        clientId: formValue.clientId,
        content: formValue.content,
        status: formValue.status,
        scheduledAt: formValue.scheduledAt ? new Date(formValue.scheduledAt).toISOString() : undefined
      };

      this.postsService.updatePost(this.editingPost.id, updateRequest).subscribe({
        next: (response) => {
          if (response.success) {
            this.closeModal();
            this.loadPosts();
          } else {
            this.errorMessage.set(response.message || 'Failed to update post');
          }
          this.saving.set(false);
        },
        error: (error: any) => {
          console.error('Error updating post:', error);
          this.errorMessage.set(error.error?.message || 'Failed to update post');
          this.saving.set(false);
        }
      });
    } else {
      // Create post
      const createRequest: CreatePostRequest = {
        clientId: formValue.clientId,
        createdByUserId: currentUserId,
        content: formValue.content,
        status: formValue.status,
        scheduledAt: formValue.scheduledAt ? new Date(formValue.scheduledAt).toISOString() : undefined
      };

      this.postsService.createPost(createRequest).subscribe({
        next: (response) => {
          if (response.success) {
            this.closeModal();
            this.loadPosts();
          } else {
            this.errorMessage.set(response.message || 'Failed to create post');
          }
          this.saving.set(false);
        },
        error: (error: any) => {
          console.error('Error creating post:', error);
          this.errorMessage.set(error.error?.message || 'Failed to create post');
          this.saving.set(false);
        }
      });
    }
  }

  deletePost(id: string) {
    if (confirm('Are you sure you want to delete this post?')) {
      this.postsService.deletePost(id).subscribe({
        next: (response) => {
          if (response.success) {
            this.loadPosts();
          } else {
            alert(response.message || 'Failed to delete post');
          }
        },
        error: (error: any) => {
          console.error('Error deleting post:', error);
          alert('Failed to delete post. Please try again.');
        }
      });
    }
  }
}

