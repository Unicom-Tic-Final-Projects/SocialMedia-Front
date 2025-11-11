import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule, KeyValuePipe } from '@angular/common';
import { Observable, throwError } from 'rxjs';
import { switchMap, tap, catchError } from 'rxjs/operators';
import { PostsService } from '../../services/client/posts.service';
import { MediaService } from '../../services/client/media.service';
import { SocialAccountsService } from '../../services/client/social-accounts.service';
import { AuthService } from '../../core/services/auth.service';
import { CreatePostRequest, UpdatePostRequest, SocialPost } from '../../models/post.models';
import { Platform, SocialAccount } from '../../models/social.models';

@Component({
  selector: 'app-post-editor',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink, KeyValuePipe],
  templateUrl: './post-editor.html',
  styleUrl: './post-editor.css',
})
export class PostEditor implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly postsService = inject(PostsService);
  private readonly mediaService = inject(MediaService);
  private readonly socialAccountsService = inject(SocialAccountsService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  postForm: FormGroup;
  loading = signal(false);
  saving = signal(false);
  errorMessage = signal<string | null>(null);
  
  // Media
  selectedFile = signal<File | null>(null);
  mediaPreview = signal<string | null>(null);
  uploadedMediaId = signal<string | null>(null);
  uploading = this.mediaService.uploading;

  // Social accounts
  socialAccounts = signal<SocialAccount[]>([]);
  selectedAccountIds = signal<string[]>([]);
  loadingAccounts = signal(false);

  // Post editing
  postId = signal<string | null>(null);
  isEditMode = computed(() => this.postId() !== null);

  // Scheduling
  scheduleMode = signal<'now' | 'later'>('now');
  scheduledDateTime = signal<string>('');

  constructor() {
    this.postForm = this.fb.group({
      content: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(4000)]],
      scheduledAt: [null],
    });
  }

  ngOnInit(): void {
    // Check if editing existing post
    const postId = this.route.snapshot.paramMap.get('id');
    if (postId) {
      this.postId.set(postId);
      this.loadPost(postId);
    }

    // Load social accounts
    this.loadSocialAccounts();
  }

  /**
   * Load existing post for editing
   */
  loadPost(postId: string): void {
    this.loading.set(true);
    this.postsService.getPost(postId).subscribe({
      next: (post) => {
        this.postForm.patchValue({
          content: post.content,
          scheduledAt: post.scheduledAt ? new Date(post.scheduledAt) : null,
        });
        
        if (post.mediaUrl) {
          this.mediaPreview.set(post.mediaUrl);
        }

        // Load selected accounts from postTargets
        // This would need to be implemented when we have the full post data
        this.loading.set(false);
      },
      error: (error) => {
        this.errorMessage.set('Failed to load post');
        this.loading.set(false);
      },
    });
  }

  /**
   * Load social accounts for platform selection
   */
  loadSocialAccounts(): void {
    this.loadingAccounts.set(true);
    this.socialAccountsService.getSocialAccounts().subscribe({
      next: (accounts) => {
        this.socialAccounts.set(accounts);
        this.loadingAccounts.set(false);
      },
      error: (error) => {
        console.error('Failed to load social accounts', error);
        this.loadingAccounts.set(false);
      },
    });
  }

  /**
   * Handle file selection
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.selectedFile.set(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.mediaPreview.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  /**
   * Remove selected media
   */
  removeMedia(): void {
    this.selectedFile.set(null);
    this.mediaPreview.set(null);
    this.uploadedMediaId.set(null);
  }

  /**
   * Upload media file
   */
  uploadMedia(): Observable<string> {
    const file = this.selectedFile();
    if (!file) {
      return throwError(() => new Error('No file selected'));
    }

    return this.mediaService.uploadMedia(file).pipe(
      tap((response) => {
        this.uploadedMediaId.set(response.id);
      }),
      switchMap((response) => {
        return new Observable<string>((observer) => {
          observer.next(response.id);
          observer.complete();
        });
      })
    );
  }

  /**
   * Toggle account selection
   */
  toggleAccount(accountId: string): void {
    const current = this.selectedAccountIds();
    if (current.includes(accountId)) {
      this.selectedAccountIds.set(current.filter((id) => id !== accountId));
    } else {
      this.selectedAccountIds.set([...current, accountId]);
    }
  }

  /**
   * Check if account is selected
   */
  isAccountSelected(accountId: string): boolean {
    return this.selectedAccountIds().includes(accountId);
  }

  /**
   * Get accounts grouped by platform
   */
  getAccountsByPlatform(): Map<string, SocialAccount[]> {
    const accounts = this.socialAccounts();
    const grouped = new Map<string, SocialAccount[]>();

    accounts.forEach((account) => {
      const platform = account.platform;
      if (!grouped.has(platform)) {
        grouped.set(platform, []);
      }
      grouped.get(platform)!.push(account);
    });

    return grouped;
  }

  /**
   * Toggle schedule mode
   */
  toggleScheduleMode(): void {
    this.scheduleMode.update((mode) => (mode === 'now' ? 'later' : 'now'));
  }

  /**
   * Save as draft
   */
  saveDraft(): void {
    if (this.postForm.invalid) {
      this.markFormGroupTouched(this.postForm);
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);

    // For draft, don't schedule
    this.createOrUpdatePost(false);
  }

  /**
   * Publish immediately
   */
  publishNow(): void {
    if (this.postForm.invalid) {
      this.markFormGroupTouched(this.postForm);
      return;
    }

    if (this.selectedAccountIds().length === 0) {
      this.errorMessage.set('Please select at least one social media account');
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);

    // Create post and publish
    this.createOrUpdatePost(false).subscribe({
      next: (post) => {
        // Publish the post
        this.postsService.publishPost(post.id).subscribe({
          next: () => {
            this.router.navigate(['/dashboard/posts']);
          },
          error: (error) => {
            this.errorMessage.set('Failed to publish post');
            this.saving.set(false);
          },
        });
      },
      error: () => {
        this.saving.set(false);
      },
    });
  }

  /**
   * Schedule post
   */
  schedulePost(): void {
    if (this.postForm.invalid) {
      this.markFormGroupTouched(this.postForm);
      return;
    }

    if (!this.scheduledDateTime()) {
      this.errorMessage.set('Please select a date and time for scheduling');
      return;
    }

    if (this.selectedAccountIds().length === 0) {
      this.errorMessage.set('Please select at least one social media account');
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);

    // Create post with scheduled date
    this.createOrUpdatePost(true).subscribe({
      next: (post) => {
        // Schedule the post
        const scheduledAt = this.scheduledDateTime();
        if (!scheduledAt) {
          this.errorMessage.set('Scheduled date/time is required');
          this.saving.set(false);
          return;
        }

        const scheduleRequest = {
          postId: post.id,
          scheduledAt: scheduledAt,
          socialAccountIds: this.selectedAccountIds(),
        };

        this.postsService.schedulePost(post.id, scheduleRequest).subscribe({
          next: () => {
            this.router.navigate(['/dashboard/posts']);
          },
          error: (error) => {
            this.errorMessage.set('Failed to schedule post');
            this.saving.set(false);
          },
        });
      },
      error: () => {
        this.saving.set(false);
      },
    });
  }

  /**
   * Create or update post
   */
  private createOrUpdatePost(isScheduled: boolean): Observable<SocialPost> {
    const user = this.authService.user();
    if (!user || !user.tenantId) {
      return throwError(() => new Error('User not authenticated'));
    }

    // Upload media first if selected
    const mediaUpload$ = this.uploadedMediaId()
      ? new Observable<string>((observer) => {
          observer.next(this.uploadedMediaId()!);
          observer.complete();
        })
      : this.selectedFile()
        ? this.uploadMedia()
        : new Observable<string>((observer) => {
            observer.next('');
            observer.complete();
          });

    return mediaUpload$.pipe(
      switchMap((mediaId) => {
        const formValue = this.postForm.value;
        const clientId = user.tenantId || user.userId; // For Individual users, use TenantId as ClientId
        // TODO: For Agencies, use selected ClientId

        if (!clientId) {
          return throwError(() => new Error('Client ID is required'));
        }

        if (this.isEditMode()) {
          // Update existing post
          const updateRequest: UpdatePostRequest = {
            content: formValue.content,
            mediaId: mediaId || undefined,
            socialAccountIds: this.selectedAccountIds(),
            scheduledAt: isScheduled ? this.scheduledDateTime() : undefined,
          };

          return this.postsService.updatePost(this.postId()!, updateRequest);
        } else {
          // Create new post
          const scheduledAt = isScheduled ? this.scheduledDateTime() : undefined;
          const createRequest: CreatePostRequest = {
            clientId: clientId,
            createdByTeamMemberId: user.userId, // Using userId as teamMemberId for now
            content: formValue.content,
            mediaId: mediaId || undefined,
            socialAccountIds: this.selectedAccountIds(),
            scheduledAt: scheduledAt || undefined,
          };

          return this.postsService.createPost(createRequest);
        }
      }),
      tap(() => {
        this.saving.set(false);
      }),
      catchError((error) => {
        this.errorMessage.set(error?.userMessage || 'Failed to save post');
        this.saving.set(false);
        return throwError(() => error);
      })
    );
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach((key) => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  get content() {
    return this.postForm.get('content');
  }

  get characterCount(): number {
    return this.postForm.value.content?.length || 0;
  }

  get maxCharacters(): number {
    return 4000;
  }
}
