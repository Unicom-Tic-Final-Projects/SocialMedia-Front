import { Component, OnInit, inject, signal, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { CommonModule, KeyValuePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription, Subject, of } from 'rxjs';
import { takeUntil, switchMap, map, catchError } from 'rxjs/operators';
import { PostsService } from '../../../services/client/posts.service';
import { MediaService } from '../../../services/client/media.service';
import { SocialAccountsService } from '../../../services/client/social-accounts.service';
import { AIService } from '../../../services/client/ai.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { LoggingService } from '../../../core/services/logging.service';
import { ClientContextService } from '../../../services/client/client-context.service';
import { CreatePostRequest, SchedulePostRequest } from '../../../models/post.models';
import { SocialAccount } from '../../../models/social.models';
import { AIAssistantComponent } from '../ai-assistant/ai-assistant';
import { MediaSelectorComponent } from './media-selector/media-selector';
import {
  FileUploadComponent,
  UploadedFile,
} from '../../../shared/file-upload/file-upload.component';

// Extended interface for post-creator with media-specific properties
interface PostCreatorUploadedFile extends UploadedFile {
  mediaId?: string;
  mediaUrl?: string;
}
import { MediaUploadService } from '../../../services/shared/media-upload.service';
import { PlatformSelectionService } from '../../../services/shared/platform-selection.service';
import { PostFormValidatorService } from '../../../services/shared/post-form-validator.service';
import { BaseComponent } from '../../../core/base/base.component';

@Component({
  selector: 'app-post-creator',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CommonModule,
    RouterLink,
    KeyValuePipe,
    AIAssistantComponent,
    MediaSelectorComponent,
    FileUploadComponent,
  ],
  templateUrl: './post-creator.html',
  styleUrl: './post-creator.css',
})
export class PostCreatorComponent extends BaseComponent implements OnInit {
  @ViewChild('fileInput') fileInputRef?: ElementRef<HTMLInputElement>;

  private readonly fb = inject(FormBuilder);
  private readonly postsService = inject(PostsService);
  private readonly mediaService = inject(MediaService);
  private readonly socialAccountsService = inject(SocialAccountsService);
  private readonly aiService = inject(AIService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly loggingService = inject(LoggingService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly clientContextService = inject(ClientContextService);
  readonly mediaUploadService = inject(MediaUploadService); // Public for template access
  private readonly platformSelectionService = inject(PlatformSelectionService);
  private readonly formValidator = inject(PostFormValidatorService);
  private routeSubscription?: Subscription;

  postForm: FormGroup;
  loading = signal(false);

  // Media - simplified state
  uploadedMediaId = signal<string | null>(null);
  uploadedFiles = signal<PostCreatorUploadedFile[]>([]);
  showMediaLibrary = signal(false);

  // Social accounts
  socialAccounts = signal<SocialAccount[]>([]);
  selectedAccountIds = signal<string[]>([]);
  loadingAccounts = signal(false);

  // AI features
  showAIAssistant = signal(false);
  aiGeneratedContent = signal<string | null>(null);

  constructor() {
    super();
    this.postForm = this.fb.group({
      content: [
        '',
        [
          Validators.required,
          Validators.minLength(1),
          Validators.maxLength(this.formValidator.MAX_CONTENT_LENGTH),
          this.formValidator.contentLengthValidator(),
        ],
      ],
      scheduledAt: [null],
      saveAsDraft: [false],
    });
  }

  ngOnInit(): void {
    this.loadSocialAccounts();
    this.checkQueryParams();
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();
    this.routeSubscription?.unsubscribe();
  }

  private checkQueryParams(): void {
    this.routeSubscription = this.route.queryParams.subscribe((params) => {
      // Handle pre-selected media from content library
      if (params['mediaId']) {
        this.loadMediaById(params['mediaId']);
      }

      // Handle pre-filled content
      if (params['content']) {
        this.postForm.patchValue({ content: decodeURIComponent(params['content']) });
      }

      // Handle image from AI generation (base64)
      if (params['imageBase64']) {
        this.loadImageFromBase64(decodeURIComponent(params['imageBase64']));
      }
      // Handle image URL from AI generation
      else if (params['mediaUrl']) {
        this.loadImageFromUrl(decodeURIComponent(params['mediaUrl']));
      }
    });
  }

  /**
   * Load image from base64 data (from AI generation)
   */
  private loadImageFromBase64(base64Data: string): void {
    try {
      // Ensure base64 data has data URL prefix
      const imageData = base64Data.startsWith('data:') 
        ? base64Data 
        : `data:image/jpeg;base64,${base64Data}`;

      // Convert base64 to blob and create a file
      const base64String = imageData.split(',')[1];
      const byteCharacters = atob(base64String);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });
      const file = new File([blob], `ai-generated-${Date.now()}.jpg`, { type: 'image/jpeg' });

      // Create uploaded file info
      const fileInfo: PostCreatorUploadedFile = {
        id: `ai-${Date.now()}`,
        file: file,
        name: `AI Generated Image`,
        size: file.size,
        type: 'image/jpeg',
        preview: imageData,
        progress: 0,
        failed: false,
      };

      // Upload to Cloudinary
      this.uploadMedia(file, fileInfo.id);
    } catch (error) {
      this.loggingService.error('Error loading image from base64', error, 'PostCreator');
      this.toastService.error('Failed to load image from AI generation');
    }
  }

  /**
   * Load image from URL (from AI generation)
   */
  private loadImageFromUrl(imageUrl: string): void {
    try {
      // Fetch image and convert to file
      fetch(imageUrl)
        .then((response) => response.blob())
        .then((blob) => {
          const file = new File([blob], `ai-generated-${Date.now()}.jpg`, { type: 'image/jpeg' });

          // Create uploaded file info
          const fileInfo: PostCreatorUploadedFile = {
            id: `ai-${Date.now()}`,
            file: file,
            name: `AI Generated Image`,
            size: file.size,
            type: 'image/jpeg',
            preview: imageUrl,
            progress: 0,
            failed: false,
          };

          // Upload to Cloudinary
          this.uploadMedia(file, fileInfo.id);
        })
        .catch((error) => {
          this.loggingService.error('Error fetching image from URL', error, 'PostCreator');
          this.toastService.error('Failed to load image from URL');
        });
    } catch (error) {
      this.loggingService.error('Error loading image from URL', error, 'PostCreator');
      this.toastService.error('Failed to load image from URL');
    }
  }

  private loadMediaById(mediaId: string): void {
    this.uploadedMediaId.set(mediaId);
    this.mediaService
      .getMedia(mediaId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (media: any) => {
          this.uploadedMediaId.set(media.id);
          // Create uploaded file info from existing media
          const fileInfo: PostCreatorUploadedFile = {
            id: `media-${media.id}`,
            file: new File([], media.fileName || 'media', { type: media.fileType || '' }),
            name: media.fileName || 'Media',
            size: 0,
            type: media.fileType || '',
            preview: media.url,
            progress: 100,
            failed: false,
          mediaId: media.id,
          mediaUrl: media.url,
        };
        this.uploadedFiles.set([fileInfo]);
      },
        error: (error: HttpErrorResponse) => {
          this.loggingService.error('Error loading media', error, 'PostCreator');
          this.toastService.error('Failed to load selected media');
        this.uploadedMediaId.set(null);
      },
    });
  }

  openMediaLibrary(): void {
    this.showMediaLibrary.set(true);
  }

  closeMediaLibrary(): void {
    this.showMediaLibrary.set(false);
  }

  selectMediaFromLibrary(mediaId: string, mediaUrl: string, fileType?: string): void {
    this.uploadedMediaId.set(mediaId);
    this.showMediaLibrary.set(false);
    
    // Create uploaded file info from library media
    const fileInfo: PostCreatorUploadedFile = {
      id: `media-${mediaId}`,
      file: new File([], 'library-media', { type: fileType || '' }),
      name: 'Library Media',
      size: 0,
      type: fileType || '',
      preview: mediaUrl,
      progress: 100,
      failed: false,
      mediaId,
      mediaUrl,
    };
    this.uploadedFiles.set([fileInfo]);
  }

  triggerFileInput(): void {
    this.fileInputRef?.nativeElement?.click();
  }

  loadSocialAccounts(): void {
    this.loadingAccounts.set(true);
    this.socialAccountsService
      .getSocialAccounts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (accounts) => {
          this.socialAccounts.set(accounts);
          this.loadingAccounts.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.loggingService.error('Error loading social accounts', error, 'PostCreator');
          this.loadingAccounts.set(false);
        },
      });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.handleFile(input.files[0]);
    }
  }

  async handleFile(file: File): Promise<void> {
    // Validate file using shared service
    const validation = this.mediaUploadService.validateFile(file);
    if (!validation.valid) {
      this.toastService.error(validation.error || 'Invalid file');
      return;
    }

    // Generate preview using shared service
    try {
      const preview = await this.mediaUploadService.generatePreview(file);
      
      // Create uploaded file info using shared service
      const fileInfo = this.mediaUploadService.createUploadedFileInfo(file, preview);
      this.uploadedFiles.set([fileInfo as PostCreatorUploadedFile]);

      // Auto-upload
      this.uploadMedia(file, fileInfo.id);
    } catch (error) {
      this.loggingService.error('Error generating preview', error, 'PostCreator');
      this.toastService.error('Failed to generate preview');
    }
  }

  onFilesSelected(files: File[]): void {
    if (files.length > 0) {
      const file = files[0]; // For now, handle single file
      this.handleFile(file);
    }
  }

  onUnacceptedFiles(_files: File[]): void {
    this.toastService.error(
      'Invalid file type. Please upload images (JPEG, PNG, GIF, WebP) or videos (MP4, MOV, AVI, WebM, etc.)',
    );
  }

  onSizeLimitExceeded(_files: File[]): void {
    // Error message is already shown by MediaUploadService validation
    // This is just a callback for the file upload component
  }

  onFileDeleted(fileId: string): void {
    const files = this.uploadedFiles();
    const fileToDelete = files.find((f) => f.id === fileId);
    if (fileToDelete) {
      this.uploadedFiles.set(files.filter((f) => f.id !== fileId));
      // Clear media ID if this was the uploaded media
      if (fileToDelete.mediaId === this.uploadedMediaId()) {
        this.uploadedMediaId.set(null);
      }
    }
  }

  onFileRetry(fileId: string): void {
    const files = this.uploadedFiles();
    const fileToRetry = files.find((f) => f.id === fileId);
    if (fileToRetry) {
      // Reset progress and retry upload
      const updatedFiles = files.map((f) =>
        f.id === fileId ? { ...f, progress: 0, failed: false } : f,
      );
      this.uploadedFiles.set(updatedFiles);
      this.uploadMedia(fileToRetry.file, fileId);
    }
  }

  uploadMedia(file: File, fileId: string): void {
    // Update file progress in uploadedFiles
    const files = this.uploadedFiles();
    const updatedFiles = files.map((f) =>
      f.id === fileId ? { ...f, progress: 0, failed: false } : f,
    );
    this.uploadedFiles.set(updatedFiles);

    // Use shared upload service
    this.mediaUploadService
      .uploadFile(file, (progress) => {
        // Update file progress in uploadedFiles
        const currentFiles = this.uploadedFiles();
        const progressFiles = currentFiles.map((f) => (f.id === fileId ? { ...f, progress } : f));
        this.uploadedFiles.set(progressFiles);
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.uploadedMediaId.set(response.mediaId);

          // Update file as complete
          const currentFiles = this.uploadedFiles();
          const completedFiles = currentFiles.map((f) =>
            f.id === fileId
              ? { ...f, progress: 100, failed: false, mediaId: response.mediaId, mediaUrl: response.mediaUrl }
              : f,
          );
          this.uploadedFiles.set(completedFiles);

          this.toastService.success('Media uploaded successfully!');
        },
        error: (error) => {
          this.loggingService.error('Error uploading media', error, 'PostCreator');
          
          // Update file as failed
          const currentFiles = this.uploadedFiles();
          const failedFiles = currentFiles.map((f) =>
            f.id === fileId ? { ...f, progress: 0, failed: true } : f,
          );
          this.uploadedFiles.set(failedFiles);
        },
      });
  }

  toggleAccountSelection(accountId: string): void {
    const current = this.selectedAccountIds();
    const updated = this.platformSelectionService.toggleAccount(accountId, current);
    this.selectedAccountIds.set(updated);
  }

  openAIAssistant(): void {
    this.showAIAssistant.set(true);
  }

  useAIContent(content: string): void {
    this.postForm.patchValue({ content });
    this.showAIAssistant.set(false);
  }

  saveAsDraft(): void {
    if (!this.formValidator.validateAndMarkTouched(this.postForm)) {
      return;
    }

    this.loading.set(true);
    const formValue = this.postForm.value;

    // TODO: Implement draft saving
    // For now, navigate to content-management with draft flag
    const queryParams: any = {
      tab: 'create',
      draft: 'true',
      content: formValue.content,
      mediaId: this.uploadedMediaId() || undefined,
    };

    // Check if we're in agency-client context
    const clientId = this.clientContextService.getCurrentClientId();
    const isAgencyClient = this.authService.isAgency() && clientId;

    if (isAgencyClient) {
      this.router.navigate(['/agency/client', clientId, 'content-management'], { queryParams });
    } else {
      this.router.navigate(['/dashboard/content-management'], { queryParams });
    }
  }

  createPost(): void {
    // Validate form
    if (!this.formValidator.validateAndMarkTouched(this.postForm)) {
      return;
    }

    // Validate account selection
    const accountValidation = this.platformSelectionService.validateAccountSelection(
      this.selectedAccountIds(),
    );
    if (!accountValidation.valid) {
      this.toastService.warning(accountValidation.error || 'Please select at least one account');
      return;
    }

    // Validate content or media
    const contentValidation = this.formValidator.validateContentOrMedia(
      this.postForm.value.content,
      !!this.uploadedMediaId(),
    );
    if (!contentValidation.valid) {
      this.toastService.warning(contentValidation.error || 'Either content or media must be provided');
      return;
    }

    this.loading.set(true);
    const formValue = this.postForm.value;

    const user = this.authService.user();
    if (!user) {
      this.toastService.error('User not authenticated');
      this.loading.set(false);
      return;
    }

    // Get the correct clientId for agency-client context
    const clientId = this.clientContextService.getCurrentClientId();
    const isAgencyClient = this.authService.isAgency() && clientId;
    const targetClientId = isAgencyClient ? clientId : user.tenantId!;

    const request: CreatePostRequest = {
      clientId: targetClientId,
      createdByTeamMemberId: user.userId,
      content: formValue.content,
      mediaId: this.uploadedMediaId() || undefined,
      socialAccountIds: this.selectedAccountIds(),
      // Don't include scheduledAt in create request - we'll schedule separately
      scheduledAt: undefined,
    };

    const scheduledAt = formValue.scheduledAt
      ? new Date(formValue.scheduledAt).toISOString()
      : null;

    this.postsService
      .createPost(request)
      .pipe(
        takeUntil(this.destroy$),
        switchMap((post) => {
          // If scheduledAt is provided, schedule the post
          if (scheduledAt && post?.id) {
            const scheduleRequest: SchedulePostRequest = {
              scheduledAt: scheduledAt,
              socialAccountIds: this.selectedAccountIds(),
            };

            return this.postsService.schedulePost(post.id, scheduleRequest).pipe(
              map(() => post),
              catchError((scheduleError: HttpErrorResponse) => {
                this.loggingService.error('Failed to schedule post', scheduleError, 'PostCreator');
                // Post was created but scheduling failed - still show success but warn user
                this.toastService.warning(
                  'Post created but scheduling failed: ' + 
                  (scheduleError?.error?.message || 'Please try scheduling again')
                );
                return of(post); // Return the post even if scheduling failed
              })
            );
          }
          return of(post);
        })
      )
      .subscribe({
        next: (post) => {
        this.loading.set(false);
        
        if (scheduledAt) {
          this.toastService.success('Post scheduled successfully!');
        } else {
          this.toastService.success('Post created successfully!');
        }
        
        // Check if we're in agency-client context
        const navClientId = this.clientContextService.getCurrentClientId();
        const isAgencyClientNav = this.authService.isAgency() && navClientId;

        // Navigate to posts tab (not published-posts)
        const queryParams: any = { tab: 'posts' };
        
        if (isAgencyClientNav) {
          // Navigate to agency-client content management
          this.router.navigate(['/agency/client', navClientId, 'content-management'], { queryParams });
        } else {
          // Navigate to individual user content management
          this.router.navigate(['/dashboard/content-management'], { queryParams });
        }
      },
      error: (error: HttpErrorResponse) => {
        this.loggingService.error('Failed to create post', error, 'PostCreator');
        this.toastService.error(error?.error?.message || 'Failed to create post');
        this.loading.set(false);
      },
    });
  }

  getAccountsByPlatform(): Map<string, SocialAccount[]> {
    return this.platformSelectionService.groupAccountsByPlatform(this.socialAccounts());
  }
}
