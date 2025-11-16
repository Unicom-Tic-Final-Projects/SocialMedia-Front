import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule, KeyValuePipe, DatePipe } from '@angular/common';
import { Observable, throwError, timer } from 'rxjs';
import { switchMap, tap, catchError, map, delay, concatMap } from 'rxjs/operators';
import { PostsService } from '../../services/client/posts.service';
import { MediaService } from '../../services/client/media.service';
import { SocialAccountsService } from '../../services/client/social-accounts.service';
import { ClientsService } from '../../services/client/clients.service';
import { AuthService } from '../../core/services/auth.service';
import { CreatePostRequest, UpdatePostRequest, SocialPost } from '../../models/post.models';
import { Platform, SocialAccount } from '../../models/social.models';
import { Client } from '../../models/client.models';
import { PostPreviewComponent } from './post-preview/post-preview.component';

@Component({
  selector: 'app-post-editor',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink, KeyValuePipe, DatePipe, PostPreviewComponent],
  templateUrl: './post-editor.html',
  styleUrl: './post-editor.css',
})
export class PostEditor implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly postsService = inject(PostsService);
  private readonly mediaService = inject(MediaService);
  private readonly socialAccountsService = inject(SocialAccountsService);
  private readonly clientsService = inject(ClientsService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  postForm: FormGroup;
  loading = signal(false);
  saving = signal(false);
  errorMessage = signal<string | null>(null);
  
  // Content value signal for reactive character count
  private contentValue = signal<string>('');
  
  // Media
  selectedFile = signal<File | null>(null);
  mediaPreview = signal<string | null>(null);
  uploadedMediaId = signal<string | null>(null);
  uploading = this.mediaService.uploading;

  // Social accounts
  socialAccounts = signal<SocialAccount[]>([]);
  selectedAccountIds = signal<string[]>([]);
  loadingAccounts = signal(false);

  // Clients
  readonly clients = this.clientsService.clients;
  readonly selectedClientId = this.clientsService.selectedClientId;
  readonly loadingClients = this.clientsService.loading;
  readonly clientsError = this.clientsService.error;
  readonly isAgency = this.authService.isAgency;

  // Post editing
  postId = signal<string | null>(null);
  isEditMode = computed(() => this.postId() !== null);

  // Scheduling
  scheduleMode = signal<'now' | 'later'>('now');
  scheduledDateTime = signal<string>('');

  // Multi-step wizard
  currentStep = signal<number>(1);
  totalSteps = 4; // Step 1: Content & Media, Step 2: Select Platforms, Step 3: Preview, Step 4: Publish/Schedule

  // Step navigation methods
  nextStep(): void {
    if (this.canGoToNextStep() && this.currentStep() < this.totalSteps) {
      this.currentStep.update(step => step + 1);
    }
  }

  previousStep(): void {
    if (this.currentStep() > 1) {
      this.currentStep.update(step => step - 1);
    }
  }

  goToStep(step: number): void {
    if (this.canGoToStep(step) && step >= 1 && step <= this.totalSteps) {
      this.currentStep.set(step);
    }
  }

  constructor() {
    this.postForm = this.fb.group({
      content: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(4000)]],
      scheduledAt: [null],
    });
    
    // Subscribe to content changes to update the reactive signal
    this.postForm.get('content')?.valueChanges.subscribe((value) => {
      this.contentValue.set(value || '');
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

    if (!this.clientsService.clients().length) {
      this.clientsService.loadClients().subscribe({
        error: (error) => console.error('Failed to load clients', error),
      });
    }
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
   * Handle content input changes for real-time character count
   */
  onContentInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    const value = target.value || '';
    
    // Update the reactive signal for character count
    this.contentValue.set(value);
    
    // Update form control value and validation
    this.postForm.get('content')?.setValue(value, { emitEvent: true });
    this.postForm.get('content')?.updateValueAndValidity();
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
        // IMPORTANT: Update form validation after media is set
        // This ensures the Next button state is re-evaluated, but it will still be
        // disabled if content is invalid (canGoToNextStep checks content validity)
        this.postForm.get('content')?.updateValueAndValidity();
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
    // Update form validation after removing media
    this.postForm.get('content')?.updateValueAndValidity();
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
        // response is MediaAssetResponse - check if it exists and has required fields
        if (!response) {
          console.error('Media upload returned undefined response');
          return;
        }
        
        if (!response.mediaId) {
          console.error('Media upload response missing mediaId', response);
          return;
        }
        
        this.uploadedMediaId.set(response.mediaId);
        // Also update preview URL to the Cloudinary URL returned from backend
        if (response.url) {
          this.mediaPreview.set(response.url);
        }
      }),
      switchMap((response) => {
        // Validate response before proceeding
        if (!response || !response.mediaId) {
          return throwError(() => new Error('Media upload failed: Invalid response from server'));
        }
        
        return new Observable<string>((observer) => {
          observer.next(response.mediaId);
          observer.complete();
        });
      }),
      catchError((error) => {
        console.error('Error uploading media:', error);
        return throwError(() => error);
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
   * Get selected social accounts for preview
   */
  getSelectedSocialAccounts(): SocialAccount[] {
    const selectedIds = this.selectedAccountIds();
    return this.socialAccounts().filter(account => selectedIds.includes(account.id));
  }


  canGoToNextStep(): boolean {
    const current = this.currentStep();
    if (current === 1) {
      // Step 1: Content must be valid - check content length directly for real-time validation
      // IMPORTANT: Media upload should NOT enable Next button if content is invalid
      const contentValue = this.postForm.get('content')?.value || '';
      const trimmedContent = contentValue.trim();
      // Content is valid if it has at least 1 character and is within max length
      const isContentValid = trimmedContent.length >= 1 && trimmedContent.length <= 4000;
      
      // Also check form validity to ensure validation rules are met
      const contentControl = this.postForm.get('content');
      const isFormValid = contentControl ? contentControl.valid : false;
      
      // Both content validation AND form validity must pass
      return isContentValid && isFormValid;
    }
    if (current === 2) {
      // Step 2: Select Platforms - at least one account must be selected
      return this.selectedAccountIds().length > 0;
    }
    if (current === 3) {
      // Step 3: Preview - can always proceed (just a preview step)
      return true;
    }
    return false;
  }

  canGoToStep(step: number): boolean {
    // Can go to previous steps, but forward steps need validation
    if (step <= this.currentStep()) {
      return true;
    }
    // Check all previous steps are valid
    for (let i = 1; i < step; i++) {
      if (i === 1 && !this.postForm.get('content')?.valid) {
        return false;
      }
      if (i === 3 && this.selectedAccountIds().length === 0) {
        return false;
      }
    }
    return true;
  }

  isStepComplete(step: number): boolean {
    switch (step) {
      case 1:
        // Step 1 is complete if content is valid (content is required)
        const contentValue = this.postForm.get('content')?.value || '';
        const trimmedContent = contentValue.trim();
        const isContentValid = trimmedContent.length >= 1 && trimmedContent.length <= 4000;
        const contentControl = this.postForm.get('content');
        const isFormValid = contentControl ? contentControl.valid : false;
        return isContentValid && isFormValid;
      case 2:
        // Step 2 is complete if at least one platform is selected
        return this.selectedAccountIds().length > 0;
      case 3:
        // Step 3 (Preview) is always complete (it's just a preview)
        return true;
      case 4:
        // Step 4 (Publish/Schedule) is complete if form is valid and platforms are selected
        return this.postForm.valid && this.selectedAccountIds().length > 0;
      default:
        return false;
    }
  }

  /**
   * Toggle schedule mode
   */
  toggleScheduleMode(): void {
    this.scheduleMode.update((mode) => (mode === 'now' ? 'later' : 'now'));
  }

  /**
   * Select client
   */
  selectClient(clientId: string): void {
    this.clientsService.setSelectedClient(clientId);
  }

  createClient(): void {
    const name = prompt('Enter client name');
    if (!name || !name.trim()) {
      return;
    }

    this.clientsService.createClient({ name: name.trim() }).subscribe({
      next: () => {
        this.errorMessage.set(null);
      },
      error: (error) => {
        console.error('Failed to create client', error);
        this.errorMessage.set('Failed to create client');
      },
    });
  }

  get activeClient(): Client | undefined {
    return this.clientsService.getSelectedClient();
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
   * Flow: Upload media to Cloudinary → Create/Update post with mediaId → Publish to social media (with image)
   */
  publishNow(): void {
    // Prevent multiple simultaneous publish requests
    if (this.saving()) {
      return;
    }

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

    const user = this.authService.user();
    if (!user || !user.tenantId) {
      this.errorMessage.set('User not authenticated');
      this.saving.set(false);
      return;
    }

    const formValue = this.postForm.value;
    
    // For agencies, client selection is required
    // For individual users, we'll get or create a default client
    const isAgency = this.isAgency();
    
    if (isAgency) {
      // Agencies must select a client
      const clients = this.clientsService.clients();
      if (!Array.isArray(clients) || clients.length === 0) {
        // Try to load clients first (but don't recurse - just wait for completion)
        this.clientsService.loadClients().subscribe({
          next: () => {
            // After clients load, get selected client and continue
            const activeClient = this.clientsService.getSelectedClient();
            if (!activeClient) {
              this.errorMessage.set('Client selection is required for agencies');
              this.saving.set(false);
              return;
            }
            // Continue with the rest of publish logic
            this.continuePublish(formValue, activeClient);
          },
          error: () => {
            this.errorMessage.set('Failed to load clients. Please try again.');
            this.saving.set(false);
          }
        });
        return;
      }

      const activeClient = this.clientsService.getSelectedClient();

      if (!activeClient) {
        this.errorMessage.set('Client selection is required for agencies');
        this.saving.set(false);
        return;
      }

      this.continuePublish(formValue, activeClient);
    } else {
      // Individual users: backend will automatically handle client creation
      // Pass tenantId as placeholder - backend will override it with default client
      const placeholderClient: Client = {
        id: user.tenantId, // Backend will override this with default client ID
        name: 'My Account',
        tenantId: user.tenantId,
        status: 'Active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.continuePublish(formValue, placeholderClient);
    }
  }


  /**
   * Continue publish flow after clients are loaded
   */
  private continuePublish(formValue: any, activeClient: Client): void {
    const user = this.authService.user();
    if (!user || !user.tenantId) {
      this.errorMessage.set('User not authenticated');
      this.saving.set(false);
      return;
    }

    // Step 1: Upload media to Cloudinary FIRST (if file is selected and not already uploaded)
    const mediaUpload$ = this.uploadedMediaId()
      ? new Observable<string>((observer) => {
          observer.next(this.uploadedMediaId()!);
          observer.complete();
        })
      : this.selectedFile()
        ? this.uploadMedia().pipe(
            tap((mediaId) => {
              // Store uploaded media ID
              this.uploadedMediaId.set(mediaId);
            })
          )
        : new Observable<string>((observer) => {
            observer.next('');
            observer.complete();
          });

    // Step 2: After media upload (if any), create/update post WITH mediaId
    mediaUpload$.pipe(
      switchMap((mediaId) => {
        if (this.isEditMode()) {
          // Update existing post with media
          const updateRequest: UpdatePostRequest = {
            content: formValue.content,
            mediaId: mediaId || undefined,
            socialAccountIds: this.selectedAccountIds(),
            scheduledAt: undefined,
          };

          return this.postsService.updatePost(this.postId()!, updateRequest);
        } else {
          // Create new post with media
          const createRequest: CreatePostRequest = {
            clientId: activeClient.id,
            createdByTeamMemberId: user.userId,
            content: formValue.content,
            mediaId: mediaId || undefined,
            socialAccountIds: this.selectedAccountIds(),
            scheduledAt: undefined,
          };

          return this.postsService.createPost(createRequest);
        }
      }),
      // Step 3: After post is created/updated, wait a moment for DB commit, then publish to social media (with image from Cloudinary)
      switchMap((post) => {
        console.log('Post created/updated successfully:', post);
        console.log('Post ID:', post?.id);
        
        if (!post?.id) {
          console.error('Post ID is missing! Cannot publish.');
          throw new Error('Post ID is missing. Cannot publish post.');
        }
        
        // Add a small delay to ensure database transaction is committed before trying to publish
        // This helps handle the race condition where publish is called immediately after creation
        console.log('Waiting 500ms before publishing to ensure post is committed...');
        return timer(500).pipe(
          switchMap(() => {
            console.log('Calling publishPost with ID:', post.id);
            return this.postsService.publishPost(post.id).pipe(
              tap(() => console.log('PublishPost returned successfully')),
              catchError((error) => {
                console.error('Error in publishPost observable:', error);
                return throwError(() => error);
              }),
              map(() => post)
            );
          })
        );
      })
    ).subscribe({
      next: () => {
        console.log('Publish flow completed successfully');
        this.saving.set(false);
        this.router.navigate(['/dashboard/posts']);
      },
      error: (error) => {
        console.error('Error in publish flow:', error);
        console.error('Error details:', {
          error,
          message: error?.message,
          userMessage: error?.userMessage,
          status: error?.status,
          url: error?.url,
          errorBody: error?.error
        });
        const errorMsg = error?.userMessage || error?.error?.message || error?.message || 'Failed to publish post';
        console.error('Setting error message:', errorMsg);
        this.errorMessage.set(errorMsg);
        this.saving.set(false);
      },
    });
  }

  /**
   * Schedule post
   */
  schedulePost(): void {
    // Prevent multiple simultaneous schedule requests
    if (this.saving()) {
      return;
    }

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
   * Note: For immediate publishing, media upload happens in publishNow().
   * For drafts/scheduled posts, we create post without media (media will be uploaded during publishing).
   */
  private createOrUpdatePost(isScheduled: boolean): Observable<SocialPost> {
    const user = this.authService.user();
    if (!user || !user.tenantId) {
      return throwError(() => new Error('User not authenticated'));
    }

    const formValue = this.postForm.value;
    const isAgency = this.isAgency();
    
    // For agencies, require client selection
    // For individual users, backend will automatically handle client
    if (isAgency) {
      const activeClient = this.clientsService.getSelectedClient();
      if (!activeClient) {
        return throwError(() => new Error('Client selection is required for agencies'));
      }
      return this.doCreateOrUpdatePost(formValue, activeClient, isScheduled, user);
    } else {
      // Individual users: backend will automatically create/get default client
      // Pass tenantId as placeholder - backend will override it
      const placeholderClient: Client = {
        id: user.tenantId, // Backend will override this with default client ID
        name: 'My Account',
        tenantId: user.tenantId,
        status: 'Active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      return this.doCreateOrUpdatePost(formValue, placeholderClient, isScheduled, user);
    }
  }

  /**
   * Execute create or update post with a client
   */
  private doCreateOrUpdatePost(formValue: any, activeClient: Client, isScheduled: boolean, user: any): Observable<SocialPost> {

    // For drafts/scheduled posts, create without media (media will be uploaded during publishing)
    // Only use already-uploaded media if it exists (for edit mode)
    const mediaId = this.uploadedMediaId() || undefined;

    if (this.isEditMode()) {
      // Update existing post
      const updateRequest: UpdatePostRequest = {
        content: formValue.content,
        mediaId: mediaId,
        socialAccountIds: this.selectedAccountIds(),
        scheduledAt: isScheduled ? this.scheduledDateTime() : undefined,
      };

      return this.postsService.updatePost(this.postId()!, updateRequest).pipe(
        tap(() => {
          this.saving.set(false);
        }),
        catchError((error) => {
          this.errorMessage.set(error?.userMessage || 'Failed to save post');
          this.saving.set(false);
          return throwError(() => error);
        })
      );
    } else {
      // Create new post (without media - media will be uploaded during publishing)
      const scheduledAt = isScheduled ? this.scheduledDateTime() : undefined;
      const createRequest: CreatePostRequest = {
        clientId: activeClient.id,
        createdByTeamMemberId: user.userId, // Using userId as teamMemberId for now
        content: formValue.content,
        mediaId: mediaId, // Only include if already uploaded (for edit mode)
        socialAccountIds: this.selectedAccountIds(),
        scheduledAt: scheduledAt || undefined,
      };

      return this.postsService.createPost(createRequest).pipe(
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

  // Reactive character count using computed signal
  readonly characterCount = computed(() => {
    const content = this.contentValue() || this.postForm.get('content')?.value || '';
    return content.length;
  });

  get maxCharacters(): number {
    return 4000;
  }

  /**
   * Check if scheduled date is valid (in the future)
   */
  isScheduledDateValid(): boolean {
    const dateTime = this.scheduledDateTime();
    if (!dateTime) {
      return false;
    }
    const scheduledDate = new Date(dateTime);
    const now = new Date();
    return scheduledDate > now;
  }

  /**
   * Check if scheduled date is invalid (empty or in the past)
   */
  isScheduledDateInvalid(): boolean {
    const dateTime = this.scheduledDateTime();
    if (!dateTime) {
      return true;
    }
    const scheduledDate = new Date(dateTime);
    const now = new Date();
    return scheduledDate <= now;
  }
}
