import { Component, OnInit, inject, signal, computed, ViewChild, Input, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Observable, throwError, timer } from 'rxjs';
import { switchMap, tap, catchError, map, takeUntil, distinctUntilChanged, debounceTime } from 'rxjs/operators';
import { PostsService } from '../../services/client/posts.service';
import { MediaService } from '../../services/client/media.service';
import { SocialAccountsService } from '../../services/client/social-accounts.service';
import { ClientsService } from '../../services/client/clients.service';
import { ClientContextService } from '../../services/client/client-context.service';
import { PostDraftService } from '../../services/client/post-draft.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { LoggingService } from '../../core/services/logging.service';
import { AIService } from '../../services/client/ai.service';
import { CreatePostRequest, UpdatePostRequest, SocialPost } from '../../models/post.models';
import { Platform, SocialAccount } from '../../models/social.models';
import { Client } from '../../models/client.models';
import { UploadedFile } from '../../shared/file-upload/file-upload.component';
// PhotoCropComponent replaced with PhotoEditorToastComponent in Step3CropEditComponent
import { Step1ContentMediaComponent } from './steps/step1-content-media/step1-content-media.component';
import { Step2PlatformSelectionComponent } from './steps/step2-platform-selection/step2-platform-selection.component';
import { Step3CropEditComponent } from './steps/step3-crop-edit/step3-crop-edit.component';
import { Step4PreviewComponent } from './steps/step4-preview/step4-preview.component';
import { Step5PublishScheduleComponent } from './steps/step5-publish-schedule/step5-publish-schedule.component';
import { MediaUploadService } from '../../services/shared/media-upload.service';
import { PlatformSelectionService } from '../../services/shared/platform-selection.service';
import { PostFormValidatorService } from '../../services/shared/post-form-validator.service';
import { PostEditorWizardService } from '../../services/shared/post-editor-wizard.service';
import { PostMediaService } from '../../services/shared/post-media.service';
import { PostPublishService } from '../../services/shared/post-publish.service';
import { BaseComponent } from '../../core/base/base.component';
import { UnsavedChangesDialogComponent } from './unsaved-changes-dialog/unsaved-changes-dialog.component';
import { MediaLibraryModalComponent } from './media-library-modal/media-library-modal.component';

@Component({
  selector: 'app-post-editor',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CommonModule,
    Step1ContentMediaComponent,
    Step2PlatformSelectionComponent,
    Step3CropEditComponent,
    Step4PreviewComponent,
    Step5PublishScheduleComponent,
    UnsavedChangesDialogComponent,
    MediaLibraryModalComponent,
  ],
  templateUrl: './post-editor.html',
  styleUrl: './post-editor.css',
})
export class PostEditor extends BaseComponent implements OnInit {
  @Input() embeddedMode: boolean = false;

  private readonly fb = inject(FormBuilder);
  private readonly postsService = inject(PostsService);
  private readonly mediaService = inject(MediaService);
  private readonly socialAccountsService = inject(SocialAccountsService);
  private readonly clientsService = inject(ClientsService);
  readonly clientContextService = inject(ClientContextService); // Public for template access
  readonly postDraftService = inject(PostDraftService); // Public for template access
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly loggingService = inject(LoggingService);
  private readonly aiService = inject(AIService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly mediaUploadService = inject(MediaUploadService);
  private readonly platformSelectionService = inject(PlatformSelectionService);
  private readonly formValidator = inject(PostFormValidatorService);
  private readonly wizardService = inject(PostEditorWizardService);
  private readonly postMediaService = inject(PostMediaService);
  private readonly publishService = inject(PostPublishService);
  
  // Track if there are unsaved changes
  private hasUnsavedChanges = signal(false);
  readonly isSavingDraft = signal(false);
  showUnsavedChangesDialog = signal(false);
  showMediaLibraryModal = signal(false);
  private lastLoadedMediaId = signal<string | null>(null);

  postForm: FormGroup;
  loading = signal(false);
  saving = signal(false);
  improvingContent = signal(false);
  showImprovementModal = signal(false);
  originalContent = signal<string>('');
  improvedContent = signal<string>('');

  // Content value signal for reactive character count
  private contentValue = signal<string>('');

  // Media - use PostMediaService
  readonly selectedFile = this.postMediaService.selectedFile;
  readonly mediaPreview = this.postMediaService.mediaPreview;
  readonly uploadedMediaId = this.postMediaService.uploadedMediaId;
  readonly uploading = this.mediaService.uploading;
  readonly isVideo = this.postMediaService.isVideo;
  readonly uploadedFiles = this.postMediaService.uploadedFiles;
  isDragging = signal(false);

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

  // Client context
  readonly isViewingClient = this.clientContextService.isViewingClientDashboard;
  readonly selectedClient = this.clientContextService.selectedClient;

  // Post editing
  postId = signal<string | null>(null);
  isEditMode = computed(() => this.postId() !== null);

  // Scheduling
  scheduleMode = signal<'now' | 'later' | 'draft'>('draft');
  scheduledDateTime = signal<string>('');

  // Multi-step wizard - use PostEditorWizardService
  readonly currentStep = this.wizardService.currentStep;
  readonly totalSteps = this.wizardService.totalSteps;
  readonly step1Completed = this.wizardService.step1Completed;
  readonly step2Completed = this.wizardService.step2Completed;
  readonly step2ValidationError = this.wizardService.step2ValidationError;
  readonly step3Completed = this.wizardService.step3Completed;
  readonly step4PreviewLoaded = this.wizardService.step4PreviewLoaded;
  readonly step5Completed = this.wizardService.step5Completed;

  // Platform-specific captions (overrides global caption)
  platformCaptions = signal<Record<Platform, string>>({} as Record<Platform, string>);

  // Platform crop configurations - use PostMediaService
  readonly platformCropConfigs = this.postMediaService.platformCropConfigs;
  readonly platformCroppedImages = this.postMediaService.platformCroppedImages;

  // PhotoCropComponent removed - now handled by Step3CropEditComponent

  // Step 1 validation: caption AND media must be present
  // Uses contentValue signal (updated on input) and mediaPreview signal for reactivity
  readonly step1Valid = computed(() => {
    const contentValue = this.contentValue();
    const trimmedContent = contentValue.trim();
    const hasContent = trimmedContent.length > 0;
    const hasMedia = !!this.mediaPreview();
    // BOTH caption AND media are required
    const validation = this.wizardService.validateStep1(hasContent, hasMedia);
    return validation.valid;
  });

  // Step navigation methods - use PostEditorWizardService
  async nextStep(): Promise<void> {
    const canProceed = await this.wizardService.nextStep(
      () => {
        // Step 1 complete callback
        this.saveStep1ToDraft();
      },
      () => {
        // Step 2 complete callback
        this.saveStep2ToDraft();
      },
      async () => {
        // Step 3 complete callback (async - generate crops)
        this.saveStep3ToDraft();
        // Crop images are now handled automatically by PhotoEditorToastComponent
        // No manual cropping needed
      },
    );
  }

  previousStep(): void {
    this.wizardService.previousStep();
  }

  goToStep(step: number): void {
    this.wizardService.goToStep(step);
  }

  constructor() {
    super();
    this.postForm = this.fb.group({
      content: [
        '',
        [
          Validators.maxLength(this.formValidator.MAX_CONTENT_LENGTH),
          this.formValidator.contentLengthValidator(),
        ],
      ], // Content is optional, but max length applies if provided
      scheduledAt: [null],
    });

    // Subscribe to content changes to update the reactive signal
    // This is a backup mechanism - onContentInput handles immediate updates
    // This subscription ensures we catch any programmatic form updates
    this.postForm
      .get('content')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((value) => {
        const currentValue = this.contentValue();
        const newValue = value || '';
        // Only update if different to avoid unnecessary signal updates
        if (currentValue !== newValue) {
          this.contentValue.set(newValue);
        }
      });
  }

  async ngOnInit(): Promise<void> {
    // Extract clientId from route if available (agency client dashboard)
    let parentRoute = this.route.parent;
    while (parentRoute) {
      const clientId = parentRoute.snapshot.params['clientId'];
      if (clientId) {
        await this.clientContextService.initializeFromRoute(clientId);
        // Auto-select the client for post creation
        const client = this.clientContextService.selectedClient();
        if (client) {
          this.clientsService.setSelectedClient(client.id);
        }
        break;
      }
      parentRoute = parentRoute.parent;
    }

    // Check if editing existing post
    // First check route params (e.g., /dashboard/post-editor/:id)
    let postId = this.route.snapshot.paramMap.get('id');

    // If not in route params, check query params (e.g., /dashboard/post-editor?postId=...)
    if (!postId) {
      postId =
        this.route.snapshot.queryParamMap.get('postId') ||
        this.route.snapshot.queryParamMap.get('id'); // Backward compatibility
    }

    if (postId) {
      this.postId.set(postId);
      this.loadPost(postId);
    } else {
      // Watch for mediaId query parameter changes (from content library)
      this.route.queryParams
        .pipe(
          distinctUntilChanged((prev, curr) => prev['mediaId'] === curr['mediaId']),
          debounceTime(100), // Prevent rapid successive calls
          takeUntil(this.destroy$)
        )
        .subscribe((params) => {
          const mediaId = params['mediaId'];
          // Validate mediaId is not empty GUID
          const isValidMediaId = mediaId && 
            mediaId !== '00000000-0000-0000-0000-000000000000' &&
            mediaId.trim() !== '';
          
          if (isValidMediaId && !this.postId() && mediaId !== this.lastLoadedMediaId()) {
            // Only load if we're not editing an existing post and it's a different media
            this.loadMediaFromLibrary(mediaId);
          } else if (!mediaId) {
            // Clear the last loaded media ID when mediaId is removed from query params
            this.lastLoadedMediaId.set(null);
          }
        });

      // Check initial mediaId on load
      const initialMediaId = this.route.snapshot.queryParamMap.get('mediaId');
      if (initialMediaId && 
          initialMediaId !== '00000000-0000-0000-0000-000000000000' &&
          initialMediaId.trim() !== '') {
        this.loadMediaFromLibrary(initialMediaId);
      }

      // Create or load active draft for new post first
      const activeDraft = this.postDraftService.getActiveDraft();
      if (!activeDraft) {
        // Create a new draft
        this.postDraftService.createDraft({
          caption: '',
          selectedPlatforms: [],
        });
      } else {
        // Load existing draft first
        this.loadDraft(activeDraft);
      }

      // Check for content query parameter (from AI Assistant or Saved Content)
      // This should override any existing draft content
      const contentParam = this.route.snapshot.queryParamMap.get('content');
      if (contentParam) {
        try {
          const decodedContent = decodeURIComponent(contentParam);
          if (decodedContent && decodedContent.trim()) {
            // Set content in form and signal
            this.postForm.patchValue({ content: decodedContent });
            this.contentValue.set(decodedContent);
            // Update draft with the content from query param
            const currentDraft = this.postDraftService.getActiveDraft();
            if (currentDraft) {
              this.postDraftService.updateDraft({
                ...currentDraft,
                caption: decodedContent,
              });
            }
          }
        } catch (error) {
          this.loggingService.error('Failed to decode content from query params', error, 'PostEditor');
        }
      }

      // Check for imageBase64 or mediaUrl query parameter (from AI Image Generator or Image Editor)
      const imageBase64 = this.route.snapshot.queryParamMap.get('imageBase64');
      const mediaUrl = this.route.snapshot.queryParamMap.get('mediaUrl');
      if (imageBase64) {
        try {
          const decodedImage = decodeURIComponent(imageBase64);
          // Convert base64 to blob and upload
          this.handleBase64Image(decodedImage);
        } catch (error) {
          this.loggingService.error('Failed to decode imageBase64 from query params', error, 'PostEditor');
        }
      } else if (mediaUrl) {
        try {
          const decodedUrl = decodeURIComponent(mediaUrl);
          // Set media preview from URL directly
          this.postMediaService.setMediaPreview(decodedUrl);
        } catch (error) {
          this.loggingService.error('Failed to decode mediaUrl from query params', error, 'PostEditor');
        }
      }
      // Reset step completion flags for new post
      this.wizardService.initialize();

      // Ensure draft exists from the start
      const draft = this.postDraftService.getActiveDraft();
      if (!draft) {
        this.postDraftService.createDraft({
          caption: '',
          selectedPlatforms: [],
        });
      }
    }

    // Load social accounts
    this.loadSocialAccounts();

    if (!this.clientsService.clients().length) {
      this.clientsService
        .loadClients()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          error: (error) => this.loggingService.error('Failed to load clients', error, 'PostEditor'),
        });
    }
  }

  /**
   * Load draft data into form and component state
   */
  loadDraft(draft: any): void {
    if (draft.caption) {
      this.postForm.patchValue({ content: draft.caption });
      // Update contentValue signal to ensure step1Valid computed updates
      this.contentValue.set(draft.caption);
    }
    // Load media from draft using PostMediaService
    this.postMediaService.loadFromDraft(draft);
    
    if (draft.selectedPlatforms) {
      // Convert platforms to account IDs (simplified - would need proper mapping)
      // For now, we'll handle this in Step 2
    }
    if (draft.platformCaptions) {
      this.platformCaptions.set(draft.platformCaptions);
    }
    
    // Don't mark as unsaved when loading existing draft
    // Only mark as unsaved if user makes changes after loading
    this.hasUnsavedChanges.set(false);
  }

  /**
   * Handle base64 image from query parameter (from AI Image Generator or Image Editor)
   */
  private handleBase64Image(base64String: string): void {
    try {
      // Check if it's already a data URL
      let base64Data = base64String;
      if (!base64Data.startsWith('data:')) {
        base64Data = `data:image/jpeg;base64,${base64Data}`;
      }

      // Set preview directly
      this.postMediaService.setMediaPreview(base64Data);
      
      // Convert to blob and upload to get media ID
      const base64Content = base64Data.split(',')[1];
      const byteCharacters = atob(base64Content);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });
      const file = new File([blob], `ai-generated-${Date.now()}.jpg`, { type: 'image/jpeg' });

      // Upload to get media ID
      this.loading.set(true);
      this.mediaService
        .uploadMedia(file)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.loading.set(false);
            if (response.id) {
              this.postMediaService.setUploadedMediaId(response.id);
            }
            this.toastService.success('Image loaded successfully');
            this.checkUnsavedChanges();
          },
          error: (error) => {
            this.loading.set(false);
            this.loggingService.error('Error uploading base64 image', error, 'PostEditor');
            // Still keep the preview even if upload fails
            this.toastService.warning('Image preview loaded, but upload failed');
          },
        });
    } catch (error) {
      this.loggingService.error('Error processing base64 image', error, 'PostEditor');
      this.toastService.error('Failed to process image');
    }
  }

  /**
   * Load media from content library by media ID
   */
  loadMediaFromLibrary(mediaId: string): void {
    // Validate mediaId
    if (!mediaId || 
        mediaId === '00000000-0000-0000-0000-000000000000' ||
        mediaId.trim() === '') {
      this.loggingService.error('Invalid mediaId provided', { mediaId }, 'PostEditor');
      return;
    }

    // Prevent duplicate loads
    if (this.lastLoadedMediaId() === mediaId) {
      return;
    }

    this.loading.set(true);
    this.postMediaService
      .loadMediaFromId(mediaId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.lastLoadedMediaId.set(mediaId);
          this.toastService.success('Media loaded from library');
          this.checkUnsavedChanges();
        },
        error: (error) => {
          this.loading.set(false);
          this.loggingService.error('Error loading media from library', error, 'PostEditor');
          this.toastService.error('Failed to load media from library');
        },
      });
  }

  /**
   * Handle media selection from library modal
   */
  onMediaSelectedFromLibrary(media: { id: string; url: string; fileType: string }): void {
    this.showMediaLibraryModal.set(false);
    this.loadMediaFromLibrary(media.id);
  }

  /**
   * Load existing post for editing
   */
  loadPost(postId: string): void {
    this.loading.set(true);
    // Get raw PostResponse to access full media information
    this.postsService
      .getPostRaw(postId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (post) => {
        this.postForm.patchValue({
          content: post.content,
          scheduledAt: post.scheduledAt ? new Date(post.scheduledAt) : null,
        });

        // Update contentValue signal to ensure step1Valid computed updates
        if (post.content) {
          this.contentValue.set(post.content);
        }

        // Load media from post
        // Priority: 1. mediaId (load full details), 2. media object, 3. mediaUrl
        if (post.mediaId) {
          // Load full media details by ID
          this.postMediaService
            .loadMediaFromId(post.mediaId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: () => {
                this.loggingService.debug('Media loaded from post mediaId', { mediaId: post.mediaId }, 'PostEditor');
                // Also save to local draft to ensure it persists
                this.postMediaService.saveToDraft();
              },
              error: (error) => {
                this.loggingService.error('Failed to load media by ID, trying fallback', error, 'PostEditor');
                // Fallback to media object or mediaUrl
                this.loadMediaFromPostFallback(post);
              }
            });
        } else if (post.media) {
          // Use media object if available
          const media = post.media;
          const mediaIdToUse = media.mediaId || media.id;
          if (mediaIdToUse) {
            this.postMediaService.setUploadedMediaId(mediaIdToUse);
          }
          this.postMediaService.setMediaPreview(media.url, media.fileType?.startsWith('video/') || false);
          
          // Create uploaded file info
          const dummyFile = new File([''], media.fileName || 'Media', { type: media.fileType || '' });
          const fileInfo: UploadedFile = {
            id: mediaIdToUse || 'post-media',
            file: dummyFile,
            name: media.fileName || 'Media from post',
            size: media.fileSize || 0,
            type: media.fileType || '',
            preview: media.thumbnailUrl || media.url,
            progress: 100,
            failed: false,
          };
          this.postMediaService.setUploadedFiles([fileInfo]);
          // Also save to local draft to ensure it persists
          this.postMediaService.saveToDraft();
        } else {
          // Fallback to mediaUrl if available (from mapped SocialPost)
          this.loadMediaFromPostFallback(post);
        }

        // Load selected accounts from postTargets
        // This would need to be implemented when we have the full post data
        
        // Don't mark as unsaved when loading existing post
        this.hasUnsavedChanges.set(false);
        this.loading.set(false);
      },
      error: (_error) => {
        this.toastService.error('Failed to load post');
        this.loading.set(false);
      },
    });
  }

  /**
   * Fallback method to load media from post when mediaId is not available
   */
  private loadMediaFromPostFallback(post: any): void {
    const mediaUrl = post.media?.url || post.mediaUrl;
    if (mediaUrl) {
      const isVideo = post.media?.fileType?.startsWith('video/') || 
                     post.mediaType === 'video' || 
                     mediaUrl?.includes('.mp4') || 
                     mediaUrl?.includes('.mov');
      this.postMediaService.setMediaPreview(mediaUrl, isVideo);
      
      // Create minimal file info
      const dummyFile = new File([''], 'Media', { type: isVideo ? 'video/*' : 'image/*' });
      const fileInfo: UploadedFile = {
        id: post.mediaId || post.media?.id || 'post-media',
        file: dummyFile,
        name: 'Media from post',
        size: 0,
        type: isVideo ? 'video/*' : 'image/*',
        preview: mediaUrl,
        progress: 100,
        failed: false,
      };
      this.postMediaService.setUploadedFiles([fileInfo]);
      // Also save to local draft to ensure it persists
      this.postMediaService.saveToDraft();
    }
  }

  /**
   * Load social accounts for platform selection
   */
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
        error: (error) => {
          this.loggingService.error('Failed to load social accounts', error, 'PostEditor');
          this.loadingAccounts.set(false);
        },
      });
  }

  /**
   * Handle content input changes for real-time character count
   * This is called from the template to ensure immediate signal update
   */
  onContentInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    const value = target.value || '';

    // CRITICAL: Update the reactive signal FIRST for immediate reactivity
    // This ensures step1Valid computed signal updates immediately
    this.contentValue.set(value);

    // Update form control value to keep form in sync
    // Use setValue with emitEvent: false to avoid circular updates
    const formControl = this.postForm.get('content');
    if (formControl && formControl.value !== value) {
      formControl.setValue(value, { emitEvent: false });
    }

    // Trigger validation check
    formControl?.updateValueAndValidity();
    
    // Mark as having unsaved changes
    this.checkUnsavedChanges();
  }
  
  /**
   * Check if there are unsaved changes
   */
  private checkUnsavedChanges(): void {
    const hasContent = this.contentValue().trim().length > 0;
    const hasMedia = !!this.mediaPreview();
    const hasSelectedPlatforms = this.selectedAccountIds().length > 0;
    
    // Consider it unsaved if there's content or media, even if not saved yet
    const unsaved = hasContent || hasMedia || hasSelectedPlatforms;
    this.hasUnsavedChanges.set(unsaved);
    
    // Debug log
    if (unsaved) {
      console.log('Unsaved changes detected:', { hasContent, hasMedia, hasSelectedPlatforms });
    }
  }
  
  /**
   * Handle browser refresh/close - show browser's default confirmation
   */
  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges() && !this.isSavingDraft()) {
      // Browser will show its own confirmation dialog
      event.preventDefault();
      event.returnValue = ''; // Chrome requires returnValue to be set
    }
  }
  
  /**
   * Check if user can leave (for route navigation)
   * Returns a promise that resolves to true if user can leave, false otherwise
   * This is used by the CanDeactivate guard
   */
  canLeave(): Promise<boolean> {
    if (!this.hasUnsavedChanges() || this.isSavingDraft()) {
      return Promise.resolve(true);
    }
    
    // Show custom unsaved changes dialog
    return new Promise<boolean>((resolve) => {
      console.log('Showing unsaved changes dialog');
      this.showUnsavedChangesDialog.set(true);
      this.pendingNavigationResolve = resolve;
    });
  }
  
  private pendingNavigationResolve: ((value: boolean) => void) | null = null;
  
  /**
   * Handle save draft from dialog
   */
  async onSaveDraftFromDialog(): Promise<void> {
    const success = await this.saveDraftBeforeLeave();
    if (success) {
      this.showUnsavedChangesDialog.set(false);
      if (this.pendingNavigationResolve) {
        this.pendingNavigationResolve(true);
        this.pendingNavigationResolve = null;
      }
    }
  }
  
  /**
   * Handle continue without saving from dialog
   */
  onContinueWithoutSavingFromDialog(): void {
    this.hasUnsavedChanges.set(false);
    this.showUnsavedChangesDialog.set(false);
    if (this.pendingNavigationResolve) {
      this.pendingNavigationResolve(true);
      this.pendingNavigationResolve = null;
    }
  }
  
  /**
   * Handle cancel from dialog
   */
  onCancelDialog(): void {
    this.showUnsavedChangesDialog.set(false);
    if (this.pendingNavigationResolve) {
      this.pendingNavigationResolve(false);
      this.pendingNavigationResolve = null;
    }
  }
  
  /**
   * Handle cancel button click
   */
  async handleCancel(): Promise<void> {
    const canLeave = await this.canLeave();
    if (canLeave) {
      // Check if we're in agency-client context
      const clientId = this.clientContextService.getCurrentClientId();
      const isAgencyClient = this.authService.isAgency() && clientId;

      if (isAgencyClient) {
        this.router.navigate(['/agency/client', clientId, 'content-management']);
      } else {
        this.router.navigate(['/dashboard/content-management']);
      }
    }
  }
  
  /**
   * Save draft before leaving
   */
  private async saveDraftBeforeLeave(): Promise<boolean> {
    if (this.saving() || this.isSavingDraft()) {
      return false; // Already saving, wait
    }
    
    this.isSavingDraft.set(true);
    
    try {
      // Save all current step data to the local draft service first
      this.saveStep1ToDraft();
      this.saveStep2ToDraft();
      this.saveStep3ToDraft();
      
      // Save to backend
      await this.createOrUpdatePost(false)
        .pipe(takeUntil(this.destroy$))
        .toPromise();
      
      this.hasUnsavedChanges.set(false);
      this.isSavingDraft.set(false);
      this.toastService.success('Draft saved successfully!');
      return true;
    } catch (error) {
      this.isSavingDraft.set(false);
      this.loggingService.error('Error saving draft before leave', error, 'PostEditor');
      this.toastService.error('Failed to save draft. Please try again.');
      return false; // Don't allow navigation if save failed
    }
  }

  /**
   * Handle file selection
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
      // Reset the file input to allow selecting the same file again
      input.value = '';
    }
  }

  /**
   * Handle file (used by both file input and drag & drop)
   */
  async handleFile(file: File): Promise<void> {
    try {
      await this.postMediaService.handleFile(file);
    } catch (error) {
      this.loggingService.error('Error handling file', error, 'PostEditor');
      this.toastService.error((error as Error).message || 'Failed to handle file');
    }
  }

  onFilesSelected(files: File[]): void {
    if (files.length > 0) {
      const file = files[0]; // For now, handle single file
      this.handleFile(file);
      this.checkUnsavedChanges();
    }
  }

  onUnacceptedFiles(_files: File[]): void {
    this.toastService.error('Invalid file type. Please upload an image or video file.');
  }

  onSizeLimitExceeded(files: File[]): void {
    if (files.length > 0) {
      const file = files[0];
      const isVideo = file.type.startsWith('video/');
      const maxSize = isVideo ? 100 : 10;
      this.toastService.error(`File size exceeds ${maxSize}MB limit. Please choose a smaller file.`);
    } else {
      this.toastService.error('File size exceeds the limit. Please choose a smaller file.');
    }
  }

  onFileDeleted(fileId: string): void {
    const files = this.uploadedFiles();
    const fileToDelete = files.find((f) => f.id === fileId);
    if (fileToDelete) {
      this.postMediaService.removeUploadedFile(fileId);
      this.removeMedia();
      this.checkUnsavedChanges();
    }
  }

  onFileRetry(fileId: string): void {
    const files = this.uploadedFiles();
    const fileToRetry = files.find((f) => f.id === fileId);
    if (fileToRetry) {
      // Reset progress and retry
      this.postMediaService.updateUploadedFile(fileId, { progress: 0, failed: false });
      this.handleFile(fileToRetry.file);
    }
  }

  /**
   * Drag and drop handlers
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  /**
   * Remove selected media
   */
  removeMedia(): void {
    this.postMediaService.removeMedia();
    // CRITICAL: Clearing mediaPreview signal will trigger step1Valid to recalculate
    // The computed signal will automatically detect the change and update
    // No need to manually trigger validation - the signal reactivity handles it
    this.checkUnsavedChanges();
  }

  /**
   * Upload media file
   */
  uploadMedia(): Observable<string> {
    return this.postMediaService.uploadMedia().pipe(
      tap(() => {
        // Save draft with updated media URL and type
        this.saveStep1ToDraft();
      }),
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
    this.checkUnsavedChanges();
  }

  /**
   * Check if account is selected
   */
  isAccountSelected(accountId: string): boolean {
    return this.selectedAccountIds().includes(accountId);
  }

  canGoToNextStep(): boolean {
    const contentValue = this.contentValue();
    const trimmedContent = contentValue.trim();
    const hasContent = trimmedContent.length > 0;
    const isContentLengthValid = trimmedContent.length === 0 || trimmedContent.length <= 4000;
    const hasMedia = !!this.mediaPreview();

    return this.wizardService.canGoToNextStep(
      this.step1Valid() && isContentLengthValid,
      this.step1Completed(),
      this.step2Completed(),
      this.step3Completed(),
      this.step4PreviewLoaded(),
    );
  }

  /**
   * Save Step 1 data to draft
   */
  saveStep1ToDraft(): void {
    // Ensure draft exists
    let draft = this.postDraftService.getActiveDraft();
    if (!draft) {
      this.postDraftService.createDraft({
        caption: '',
        selectedPlatforms: [],
      });
      draft = this.postDraftService.getActiveDraft();
    }

    const content = this.postForm.get('content')?.value || '';
    this.postDraftService.updateDraft({
      caption: content,
    });

    // Save media state using PostMediaService
    this.postMediaService.saveToDraft();
  }

  /**
   * Save Step 2 data to draft
   * Note: Platforms are already saved via togglePlatform() method
   */
  saveStep2ToDraft(): void {
    // Platforms are already saved when user toggles them in Step 2
    // This method is kept for consistency but doesn't need to do anything
  }

  /**
   * Save Step 3 data to draft (crop configs, cropped images, and platform captions)
   */
  saveStep3ToDraft(): void {
    const platformCaptions = this.platformCaptions();
    this.postDraftService.updateDraft({
      platformCaptions,
    });
    // Save media state (includes crop configs and cropped images)
    this.postMediaService.saveToDraft();
  }

  /**
   * Handle crop configs change from photo-crop component
   */
  onCropConfigsChange(
    configs: Record<
      Platform,
      {
        crop: { zoom: number; offsetX: number; offsetY: number };
        cropBox: { width: number; height: number; left: number; top: number };
      }
    >,
  ): void {
    this.postMediaService.updatePlatformCropConfigs(configs);
    // Auto-save to draft when crop changes
    this.saveStep3ToDraft();
  }

  /**
   * Handle cropped images change from photo-crop component
   */
  onCroppedImagesChange(croppedImages: Record<Platform, string>): void {
    this.postMediaService.updatePlatformCroppedImages(croppedImages);
    // Auto-save to draft when cropped images change
    this.saveStep3ToDraft();
  }

  /**
   * Detect media type from URL
   */
  detectedMediaType(): 'image' | 'video' | null {
    return this.postMediaService.detectMediaType();
  }

  canGoToStep(step: number): boolean {
    return this.wizardService.canGoToStep(step);
  }

  /**
   * Check if a step is completed
   * Steps show checkmark ONLY after they are explicitly completed (by clicking Next)
   */
  isStepComplete(step: number): boolean {
    return this.wizardService.isStepComplete(step);
  }

  /**
   * Update platform-specific caption
   */
  updatePlatformCaption(platform: Platform, caption: string): void {
    const current = this.platformCaptions();
    this.platformCaptions.set({ ...current, [platform]: caption });
    this.postDraftService.updatePlatformCaption(platform, caption);
    // Auto-save to draft
    this.saveStep3ToDraft();
    // Note: Step 3 completion is set when Next is clicked, not automatically
  }

  /**
   * Get caption for a platform (platform-specific if exists, otherwise global)
   */
  getPlatformCaption(platform: Platform): string {
    const draft = this.postDraftService.getActiveDraft();
    if (!draft) return '';
    return draft.platformCaptions?.[platform] || draft.caption || '';
  }

  /**
   * Get all available platforms (not just connected ones)
   */
  getAllPlatforms(): Platform[] {
    return this.platformSelectionService.getAllPlatforms();
  }

  /**
   * Check if a platform is selected
   */
  isPlatformSelected(platform: Platform): boolean {
    const draft = this.postDraftService.getActiveDraft();
    return this.platformSelectionService.isPlatformSelected(
      platform,
      draft?.selectedPlatforms || [],
    );
  }

  /**
   * Toggle platform selection
   */
  togglePlatform(platform: Platform): void {
    const draft = this.postDraftService.getActiveDraft();
    if (!draft) return;

    const currentPlatforms = draft.selectedPlatforms || [];
    const newPlatforms = this.platformSelectionService.togglePlatform(platform, currentPlatforms);

    this.postDraftService.updateSelectedPlatforms(newPlatforms);

    // Clear validation error when a platform is selected
    if (newPlatforms.length > 0) {
      this.wizardService.clearStep2ValidationError();
    }
  }

  /**
   * Get connected accounts for a specific platform
   */
  getConnectedAccountsForPlatform(platform: Platform): SocialAccount[] {
    return this.platformSelectionService.getConnectedAccountsForPlatform(
      platform,
      this.socialAccounts(),
    );
  }

  /**
   * Get account IDs from selected platforms in draft
   * This converts the platform selections from Step 2 into actual account IDs
   */
  getAccountIdsFromSelectedPlatforms(): string[] {
    const draft = this.postDraftService.getActiveDraft();
    const selectedPlatforms = draft?.selectedPlatforms || [];

    return this.platformSelectionService.getAccountIdsFromSelectedPlatforms(
      selectedPlatforms,
      this.socialAccounts(),
    );
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

    this.clientsService
      .createClient({ name: name.trim() })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
        // Clear any previous errors
      },
      error: (error) => {
        this.loggingService.error('Failed to create client', error, 'PostEditor');
        this.toastService.error('Failed to create client');
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
    // Prevent multiple simultaneous save requests
    if (this.saving()) {
      return;
    }

    // Validate form
    if (this.postForm.invalid) {
      this.markFormGroupTouched(this.postForm);
      return;
    }

    // Save all current step data to the local draft service first
    this.saveStep1ToDraft();
    this.saveStep2ToDraft();
    this.saveStep3ToDraft();

    this.saving.set(true);

    // Save to backend as draft (createOrUpdatePost creates posts with status "Draft" by default)
    // For draft, don't schedule (isScheduled = false)
    this.createOrUpdatePost(false)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (post) => {
        this.saving.set(false);
        this.toastService.success('Draft saved successfully!');

        // If this was a new post, update postId so we can edit it later
        if (!this.postId()) {
          this.postId.set(post.id);
        }

        // CRITICAL: After saving to backend, ensure the local draft service has the latest mediaId
        // This ensures that if the user comes back to edit, the media is preserved
        const currentMediaId = this.uploadedMediaId();
        if (currentMediaId) {
          this.postDraftService.updateMediaId(currentMediaId);
          // Also ensure media state is saved to local draft
          this.postMediaService.saveToDraft();
        }

        // Log for debugging
        this.loggingService.debug('Draft saved to backend', { post, mediaId: currentMediaId }, 'PostEditor');
        
        // Reset unsaved changes flag
        this.hasUnsavedChanges.set(false);

        // Navigate to drafts tab in content-management
        const queryParams = { tab: 'drafts' };
        
        // Check if we're in agency-client context
        const clientId = this.clientContextService.getCurrentClientId();
        const isAgencyClient = this.authService.isAgency() && clientId;

        if (isAgencyClient) {
          this.router.navigate(['/agency/client', clientId, 'content-management'], { queryParams });
        } else {
          this.router.navigate(['/dashboard/content-management'], { queryParams });
        }
      },
      error: (error) => {
        this.saving.set(false);
        const errorMsg = error?.error?.message || error?.message || 'Failed to save draft';
        this.toastService.error('Failed to save draft', errorMsg);
        this.loggingService.error('Error saving draft', error, 'PostEditor');
      },
    });
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

    // Check if platforms are selected from draft
    const draft = this.postDraftService.getActiveDraft();
    const hasPlatforms = (draft?.selectedPlatforms?.length ?? 0) > 0;
    if (!hasPlatforms) {
      this.toastService.warning('Please select at least one platform');
      return;
    }

    this.saving.set(true);

    const formValue = this.postForm.value;
    const accountIds = this.getAccountIdsFromSelectedPlatforms();

    if (accountIds.length === 0) {
      this.toastService.warning('No connected accounts found for selected platforms');
      this.saving.set(false);
      return;
    }

    // Save Step 3 to ensure latest crop configs
    this.saveStep3ToDraft();

    const publishOptions = {
      content: formValue.content,
      isEditMode: this.isEditMode(),
      postId: this.postId() || undefined,
      accountIds,
      platformCropConfigs: this.platformCropConfigs(),
      platformCroppedImages: this.platformCroppedImages(),
      isVideo: this.isVideo(),
      mediaType: this.detectedMediaType() || undefined,
      onGenerateCrop: undefined, // Cropping now handled by PhotoEditorToastComponent automatically
    };

    this.publishService
      .publishPost(this.uploadedMediaId(), this.selectedFile(), publishOptions)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (post) => {
          this.saving.set(false);
          this.wizardService.markStepComplete(5);
          this.hasUnsavedChanges.set(false);
          this.publishService.handlePublishSuccess(post);
        },
        error: (error) => {
          this.saving.set(false);
          this.publishService.handlePublishError(error);
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
      this.toastService.warning('Please select a date and time for scheduling');
      return;
    }

    // Validate that scheduled date is in the future
    const scheduledDate = new Date(this.scheduledDateTime());
    const now = new Date();
    if (scheduledDate <= now) {
      this.toastService.error('Cannot schedule posts in the past. Please select a future date and time.');
      return;
    }

    // Check if platforms are selected from draft
    const draft = this.postDraftService.getActiveDraft();
    const hasPlatforms = (draft?.selectedPlatforms?.length ?? 0) > 0;
    if (!hasPlatforms) {
      this.toastService.warning('Please select at least one platform');
      return;
    }

    this.saving.set(true);

    const formValue = this.postForm.value;
    const accountIds = this.getAccountIdsFromSelectedPlatforms();

    if (accountIds.length === 0) {
      this.toastService.warning('No connected accounts found for selected platforms');
      this.saving.set(false);
      return;
    }

    // Save Step 3 to ensure latest crop configs
    this.saveStep3ToDraft();

    const scheduleOptions = {
      content: formValue.content,
      isEditMode: this.isEditMode(),
      postId: this.postId() || undefined,
      accountIds,
      platformCropConfigs: this.platformCropConfigs(),
      platformCroppedImages: this.platformCroppedImages(),
      isVideo: this.isVideo(),
      mediaType: this.detectedMediaType() || undefined,
      scheduledAt: this.scheduledDateTime(),
    };

    this.publishService
      .schedulePost(this.uploadedMediaId(), scheduleOptions)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
        this.saving.set(false);
        this.wizardService.markStepComplete(5);
        this.hasUnsavedChanges.set(false);
        this.publishService.handleScheduleSuccess();
      },
      error: (error) => {
        this.saving.set(false);
        this.publishService.handleScheduleError(error);
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
        updatedAt: new Date().toISOString(),
      };
      return this.doCreateOrUpdatePost(formValue, placeholderClient, isScheduled, user);
    }
  }

  /**
   * Execute create or update post with a client
   */
  private doCreateOrUpdatePost(
    formValue: any,
    activeClient: Client,
    isScheduled: boolean,
    user: any,
  ): Observable<SocialPost> {
    // For drafts/scheduled posts, create without media (media will be uploaded during publishing)
    // Only use already-uploaded media if it exists (for edit mode)
    const mediaId = this.uploadedMediaId() || undefined;

    // Get account IDs from selected platforms (Step 2)
    const accountIds = this.getAccountIdsFromSelectedPlatforms();
    if (accountIds.length === 0 && !isScheduled) {
      // For scheduled posts, we allow empty accountIds (will be set during scheduling)
      // But for immediate publishing, we need accounts
    }

    // Get platform crop configs from draft (source of truth for what was previewed)
    // Ensure we have the absolute latest crop configs by saving Step 3 one more time
    this.saveStep3ToDraft();
    const draft = this.postDraftService.getActiveDraft();
    const platformCropConfigs = draft?.platformCropConfigs || this.platformCropConfigs();

    // Log crop configs for debugging
    this.loggingService.debug('Saving post with crop configs', platformCropConfigs, 'PostEditor');

    if (this.isEditMode()) {
      // Update existing post
      // Note: Don't include scheduledAt in update request - it will be set via schedule endpoint
      // Note: Don't include platformCropConfigs in update request - backend doesn't support it
      const updateRequest: UpdatePostRequest = {
        content: formValue.content,
        mediaId: mediaId,
        socialAccountIds: accountIds.length > 0 ? accountIds : this.selectedAccountIds(),
        // scheduledAt should NOT be included here - it will be set via /api/posts/{postId}/schedule
        // platformCropConfigs should NOT be included here - backend UpdatePostRequest doesn't support it
      };

      console.log('Update post request:', JSON.stringify(updateRequest, null, 2));
      return this.postsService.updatePost(this.postId()!, updateRequest).pipe(
        tap(() => {
          this.saving.set(false);
        }),
        catchError((error) => {
          this.toastService.error(error?.userMessage || 'Failed to save post');
          this.saving.set(false);
          return throwError(() => error);
        }),
      );
    } else {
      // Create new post (without media - media will be uploaded during publishing)
      const scheduledAt = isScheduled ? this.scheduledDateTime() : undefined;
      const createRequest: CreatePostRequest = {
        clientId: activeClient.id,
        createdByTeamMemberId: user.userId, // Using userId as teamMemberId for now
        content: formValue.content,
        mediaId: mediaId, // Only include if already uploaded (for edit mode)
        socialAccountIds: accountIds.length > 0 ? accountIds : this.selectedAccountIds(),
        scheduledAt: scheduledAt || undefined,
        platformCropConfigs:
          Object.keys(platformCropConfigs).length > 0 ? platformCropConfigs : undefined,
      };

      this.loggingService.debug('Create post request', createRequest, 'PostEditor');
      return this.postsService.createPost(createRequest).pipe(
        tap(() => {
          this.saving.set(false);
        }),
        catchError((error) => {
          this.toastService.error(error?.userMessage || 'Failed to save post');
          this.saving.set(false);
          return throwError(() => error);
        }),
      );
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    this.formValidator.markFormGroupTouched(formGroup);
  }

  get content() {
    return this.postForm.get('content');
  }

  // Reactive character count using computed signal
  readonly characterCount = computed(() => {
    const content = this.contentValue() || this.postForm.get('content')?.value || '';
    return this.formValidator.getCharacterCount(content);
  });

  readonly hasContent = computed(() => {
    const contentValue = this.contentValue() || this.content?.value || '';
    return this.formValidator.hasContent(contentValue);
  });

  get maxCharacters(): number {
    return this.formValidator.MAX_CONTENT_LENGTH;
  }

  /**
   * Check if scheduled date is valid (in the future)
   */
  isScheduledDateValid(): boolean {
    return this.formValidator.isScheduledDateValid(this.scheduledDateTime());
  }

  /**
   * Check if scheduled date is invalid (empty or in the past)
   */
  isScheduledDateInvalid(): boolean {
    return this.formValidator.isScheduledDateInvalid(this.scheduledDateTime());
  }

  /**
   * Improve content using AI
   */
  improveContentWithAI(): void {
    const currentContent = this.content?.value || '';
    if (!currentContent.trim()) {
      this.toastService.warning('Please enter some content to improve');
      return;
    }

    const user = this.authService.user();
    if (!user || !user.tenantId) {
      this.toastService.error('User not authenticated');
      return;
    }

    this.improvingContent.set(true);

    // Use generateCaptions with improvement prompt
    // We'll use the current content as the topic and ask AI to improve it
    // Note: request object was created but not used - using improveContent directly instead

    // Store original content
    this.originalContent.set(currentContent);

    // Use improveContent method - this actually improves the existing content (not generate new)
    this.aiService
      .improveContent({
        tenantId: user.tenantId,
        content: currentContent.trim(),
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (improved: string | undefined) => {
          // Ensure we have a valid string
          const improvedContentStr: string = improved || currentContent.trim() || '';

          // Clean the improved content - ensure it's always a string
          let cleanedContentStr: string =
            this.cleanImprovedContent(improvedContentStr) || improvedContentStr;
          if (!cleanedContentStr || cleanedContentStr.trim().length === 0) {
            cleanedContentStr = improvedContentStr;
          }

          // The AI response should already include hashtags at the end
          // Format is: improved content text followed by blank line(s), then hashtags
          // Parse and ensure proper formatting
          let finalContent = cleanedContentStr;

          // Check if hashtags are already included (they should be from backend)
          // If hashtags are missing, try to extract them or the content is ready as-is
          // The backend now includes hashtags automatically, so we should be good

          // Clean up any extra whitespace or formatting issues
          finalContent = finalContent.trim();

          // Ensure there's a blank line between content and hashtags if hashtags exist
          // Find if there are hashtags (lines starting with #)
          const lines = finalContent.split('\n');
          const hashtagLines: string[] = [];
          const contentLines: string[] = [];
          let foundBlankLine = false;

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line === '') {
              foundBlankLine = true;
              continue;
            }

            // If we found a blank line and this line has hashtags, collect hashtag lines
            if (foundBlankLine && (line.includes('#') || line.match(/^#\w+/))) {
              hashtagLines.push(line);
            } else if (!foundBlankLine || hashtagLines.length === 0) {
              contentLines.push(lines[i]);
            }
          }

          // Reconstruct with proper formatting
          const mainContent = contentLines.join('\n').trim();
          if (hashtagLines.length > 0) {
            const hashtags = hashtagLines.join(' ').trim();
            finalContent = mainContent + '\n\n' + hashtags;
          } else {
            finalContent = mainContent;
          }

          // Store improved content and show modal
          this.improvedContent.set(finalContent);
          this.showImprovementModal.set(true);
          this.improvingContent.set(false);
        },
        error: (error) => {
          this.loggingService.error('Error improving content', error, 'PostEditor');
          const errorMsg =
            error?.error?.message ||
            error?.message ||
            'Failed to improve content. Please try again.';
          this.toastService.error('AI Improvement Failed', errorMsg);
          this.improvingContent.set(false);
        },
      });
  }

  /**
   * Accept the improved content
   */
  acceptImprovedContent(): void {
    const improved = this.improvedContent();
    if (improved) {
      this.content?.setValue(improved);
      this.contentValue.set(improved);
      this.showImprovementModal.set(false);
      this.toastService.success('Content updated successfully!');
    }
  }

  /**
   * Reject the improved content and keep original
   */
  rejectImprovedContent(): void {
    this.showImprovementModal.set(false);
  }

  /**
   * Close the improvement modal
   */
  closeImprovementModal(): void {
    this.showImprovementModal.set(false);
  }

  /**
   * Clean up improved content by removing prompt text, JSON formatting, and other artifacts
   */
  private cleanImprovedContent(content: string): string {
    if (!content) return '';

    let cleaned = content;

    // Remove common prompt prefixes that might be included in the response
    cleaned = cleaned.replace(/^Perfect caption for your post:\s*/gi, '');
    cleaned = cleaned.replace(
      /^Generate \d+ engaging social media captions for the topic:\s*/gi,
      '',
    );
    cleaned = cleaned.replace(/^Context:.*?Return the response in JSON format:.*$/gis, '');
    cleaned = cleaned.replace(/This caption is designed to maximize engagement.*$/gi, '');
    cleaned = cleaned.replace(/Each caption should be unique.*$/gi, '');

    // Remove topic quote patterns like: 'topic text': or 'topic text'
    cleaned = cleaned.replace(/^'[^']*':\s*/g, '');
    cleaned = cleaned.replace(/^'([^']*)'$/g, '$1');

    // Remove JSON wrapper patterns if the response includes raw JSON
    cleaned = cleaned.replace(/^{"captions":\[\{"caption":"/g, '');
    cleaned = cleaned.replace(/","hashtags":\[.*?\],"tone":"[^"]*"\}\]}$/g, '');
    cleaned = cleaned.replace(/\\"/g, '"');
    cleaned = cleaned.replace(/\\n/g, '\n');

    // Extract caption from JSON if present (e.g., "caption":"text")
    const jsonCaptionMatch = cleaned.match(/["']caption["']\s*:\s*["']([^"']+)["']/i);
    if (jsonCaptionMatch && jsonCaptionMatch[1]) {
      cleaned = jsonCaptionMatch[1].trim();
    }

    // Remove any remaining JSON artifacts
    cleaned = cleaned.replace(/^\s*[{[]\s*/g, '');
    cleaned = cleaned.replace(/\s*[}\]]\s*$/g, '');

    // Remove escape sequences
    cleaned = cleaned.replace(/\\"/g, '"');
    cleaned = cleaned.replace(/\\'/g, "'");
    cleaned = cleaned.replace(/\\n/g, '\n');

    // Remove quote marks at start/end
    cleaned = cleaned.replace(/^["']+|["']+$/g, '');

    // Clean up multiple whitespace
    cleaned = cleaned.replace(/\s+/g, ' ');
    cleaned = cleaned.replace(/\n\s*\n/g, '\n\n');

    return cleaned.trim();
  }

}
