import { Component, OnInit, inject, signal, computed, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { Observable, throwError, timer } from 'rxjs';
import { switchMap, tap, catchError, map, delay, concatMap } from 'rxjs/operators';
import { PostsService } from '../../services/client/posts.service';
import { MediaService } from '../../services/client/media.service';
import { SocialAccountsService } from '../../services/client/social-accounts.service';
import { ClientsService } from '../../services/client/clients.service';
import { ClientContextService } from '../../services/client/client-context.service';
import { PostDraftService } from '../../services/client/post-draft.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { CreatePostRequest, UpdatePostRequest, SocialPost } from '../../models/post.models';
import { Platform, SocialAccount } from '../../models/social.models';
import { Client } from '../../models/client.models';
import { PhotoCropComponent } from './photo-crop/photo-crop.component';
import { PostPreviewComponent } from '../posts-page/post-preview/post-preview.component';
import { FileUploadComponent, UploadedFile } from '../../shared/file-upload/file-upload.component';

@Component({
  selector: 'app-post-editor',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink, DatePipe, PhotoCropComponent, PostPreviewComponent, FileUploadComponent],
  templateUrl: './post-editor.html',
  styleUrl: './post-editor.css',
})
export class PostEditor implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly postsService = inject(PostsService);
  private readonly mediaService = inject(MediaService);
  private readonly socialAccountsService = inject(SocialAccountsService);
  private readonly clientsService = inject(ClientsService);
  readonly clientContextService = inject(ClientContextService); // Public for template access
  readonly postDraftService = inject(PostDraftService); // Public for template access
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  postForm: FormGroup;
  loading = signal(false);
  saving = signal(false);
  
  // Content value signal for reactive character count
  private contentValue = signal<string>('');
  
  // Media
  selectedFile = signal<File | null>(null);
  mediaPreview = signal<string | null>(null);
  uploadedMediaId = signal<string | null>(null);
  uploading = this.mediaService.uploading;
  isDragging = signal(false);
  isVideo = signal(false);
  uploadedFiles = signal<UploadedFile[]>([]);

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
  scheduleMode = signal<'now' | 'later'>('now');
  scheduledDateTime = signal<string>('');

  // Multi-step wizard
  currentStep = signal<number>(1);
  totalSteps = 5; // Step 1: Content & Media, Step 2: Select Platforms, Step 3: Crop/Edit per Platform, Step 4: Preview, Step 5: Publish/Schedule
  
  // Platform-specific captions (overrides global caption)
  platformCaptions = signal<Record<Platform, string>>({} as Record<Platform, string>);

  // Platform crop configurations (stored per platform)
  platformCropConfigs = signal<Record<Platform, { crop: { zoom: number; offsetX: number; offsetY: number }; cropBox: { width: number; height: number; left: number; top: number } }>>({} as any);
  
  // Platform cropped images (base64 strings per platform)
  platformCroppedImages = signal<Record<Platform, string>>({} as Record<Platform, string>);
  
  @ViewChild(PhotoCropComponent) photoCropComponent?: PhotoCropComponent;

  // Step completion tracking - checkmarks only show after clicking Next
  step1Completed = signal<boolean>(false); // True only after clicking Next in Step 1
  step2Completed = signal<boolean>(false); // True only after clicking Next in Step 2
  step2ValidationError = signal<boolean>(false); // True when Next clicked without platform selection
  step3Completed = signal<boolean>(false); // True when crop + captions are saved AND Next clicked
  step4PreviewLoaded = signal<boolean>(false); // True when preview is loaded AND Next clicked
  step5Completed = signal<boolean>(false); // True when publish/schedule is completed

  // Step 1 validation: caption AND media must be present
  // Uses contentValue signal (updated on input) and mediaPreview signal for reactivity
  readonly step1Valid = computed(() => {
    const contentValue = this.contentValue();
    const trimmedContent = contentValue.trim();
    const hasContent = trimmedContent.length > 0;
    const hasMedia = !!this.mediaPreview();
    // BOTH caption AND media are required
    const isValid = hasContent && hasMedia;
    return isValid;
  });

  // Step navigation methods
  nextStep(): void {
    const current = this.currentStep();
    
    // Step 2: Check validation before proceeding
    if (current === 2) {
      const draft = this.postDraftService.getActiveDraft();
      const hasPlatforms = (draft?.selectedPlatforms?.length ?? 0) > 0;
      if (!hasPlatforms) {
        // Show validation error
        this.step2ValidationError.set(true);
        return; // Don't proceed
      } else {
        // Clear error if platforms are selected
        this.step2ValidationError.set(false);
      }
    }
    
    if (this.canGoToNextStep() && this.currentStep() < this.totalSteps) {
      // Mark current step as completed when moving to next
      if (current === 1) {
        // Save draft before marking as completed
        this.saveStep1ToDraft();
        // Mark Step 1 as completed - this will show the checkmark
        this.step1Completed.set(true);
      } else if (current === 2) {
        this.step2Completed.set(true);
        this.step2ValidationError.set(false); // Clear error on success
        this.saveStep2ToDraft();
      } else if (current === 3) {
        // CRITICAL: Generate all cropped images BEFORE allowing Step 4 preview to load
        // This ensures:
        // 1. Preview shows EXACT cropped images (not original with transforms)
        // 2. Published post uses SAME cropped images
        // 3. 100% visual consistency between preview and published output
        this.saveStep3ToDraft();
        
        if (this.photoCropComponent) {
          // Generate crops for all platforms and WAIT for completion
          // Don't proceed to Step 4 until crops are ready
          this.photoCropComponent.cropAllImages().then(() => {
            // Save crops to draft after generation completes
            this.saveStep3ToDraft();
            // Mark step as completed and move to preview
            // Preview will now show exact cropped images matching what will be published
            this.step3Completed.set(true);
            this.currentStep.set(4);
          }).catch(err => {
            console.error('Error cropping images:', err);
            // Even on error, try to save what we have and proceed
            this.saveStep3ToDraft();
            this.step3Completed.set(true);
            this.currentStep.set(4);
          });
          // IMPORTANT: Don't change step yet - wait for crops to complete
          // This ensures Step 4 preview always has cropped images ready
          return;
        } else {
          // If component not available, try to proceed but warn
          console.warn('PhotoCropComponent not available - crops may not be generated');
          setTimeout(() => {
            this.saveStep3ToDraft();
            this.step3Completed.set(true);
            this.currentStep.set(4);
          }, 100);
          return;
        }
      } else if (current === 4) {
        // Mark Step 4 as completed when moving to Step 5
        this.step4PreviewLoaded.set(true);
      } else if (current === 5) {
        // Step 5 completion is handled when publish/schedule is actually executed
        // For now, we just allow moving forward (this can be enhanced later)
      }
      
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
      content: ['', [Validators.maxLength(4000)]], // Content is optional, but max length applies if provided
      scheduledAt: [null],
    });
    
    // Subscribe to content changes to update the reactive signal
    // This is a backup mechanism - onContentInput handles immediate updates
    // This subscription ensures we catch any programmatic form updates
    this.postForm.get('content')?.valueChanges.subscribe((value) => {
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
    const postId = this.route.snapshot.paramMap.get('id');
    if (postId) {
      this.postId.set(postId);
      this.loadPost(postId);
    } else {
      // Create or load active draft for new post
      const activeDraft = this.postDraftService.getActiveDraft();
      if (!activeDraft) {
        // Create a new draft
        this.postDraftService.createDraft({
          caption: '',
          selectedPlatforms: [],
        });
      } else {
        // Load existing draft
        this.loadDraft(activeDraft);
      }
      // Reset step completion flags for new post
      this.step1Completed.set(false);
      this.step2Completed.set(false);
      this.step3Completed.set(false);
      this.step4PreviewLoaded.set(false);
      this.step5Completed.set(false);
      
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
      this.clientsService.loadClients().subscribe({
        error: (error) => console.error('Failed to load clients', error),
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
    if (draft.mediaUrl) {
      this.mediaPreview.set(draft.mediaUrl);
    }
    if (draft.selectedPlatforms) {
      // Convert platforms to account IDs (simplified - would need proper mapping)
      // For now, we'll handle this in Step 2
    }
    if (draft.platformCaptions) {
      this.platformCaptions.set(draft.platformCaptions);
    }
    if (draft.platformCropConfigs) {
      this.platformCropConfigs.set(draft.platformCropConfigs);
    }
    if (draft.platformCroppedImages) {
      this.platformCroppedImages.set(draft.platformCroppedImages);
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
        
        // Update contentValue signal to ensure step1Valid computed updates
        if (post.content) {
          this.contentValue.set(post.content);
        }
        
        if (post.mediaUrl) {
          this.mediaPreview.set(post.mediaUrl);
        }

        // Load selected accounts from postTargets
        // This would need to be implemented when we have the full post data
        this.loading.set(false);
      },
      error: (error) => {
        this.toastService.error('Failed to load post');
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
  handleFile(file: File): void {
    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      this.toastService.error('File size exceeds 10MB limit. Please choose a smaller file.');
      return;
    }

    // Validate file type
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (!isImage && !isVideo) {
      this.toastService.error('Invalid file type. Please upload an image or video file.');
      return;
    }

    this.selectedFile.set(file);
    this.isVideo.set(isVideo);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = e.target?.result as string;
      // CRITICAL: Setting mediaPreview signal will automatically trigger step1Valid to recalculate
      // The computed signal reactivity handles the update - no manual validation needed
      this.mediaPreview.set(preview);
      
      // Add to uploaded files list
      const fileId = `file-${Date.now()}-${Math.random()}`;
      const newFile: UploadedFile = {
        id: fileId,
        file: file,
        name: file.name,
        size: file.size,
        progress: 0,
        failed: false,
        type: file.type,
        preview: preview
      };
      this.uploadedFiles.set([newFile]);
    };
    reader.readAsDataURL(file);
  }

  onFilesSelected(files: File[]): void {
    if (files.length > 0) {
      const file = files[0]; // For now, handle single file
      this.handleFile(file);
    }
  }

  onUnacceptedFiles(files: File[]): void {
    this.toastService.error('Invalid file type. Please upload an image or video file.');
  }

  onSizeLimitExceeded(files: File[]): void {
    this.toastService.error('File size exceeds 10MB limit. Please choose a smaller file.');
  }

  onFileDeleted(fileId: string): void {
    const files = this.uploadedFiles();
    const fileToDelete = files.find(f => f.id === fileId);
    if (fileToDelete) {
      this.uploadedFiles.set(files.filter(f => f.id !== fileId));
      this.removeMedia();
    }
  }

  onFileRetry(fileId: string): void {
    const files = this.uploadedFiles();
    const fileToRetry = files.find(f => f.id === fileId);
    if (fileToRetry) {
      // Reset progress and retry
      const updatedFiles = files.map(f => 
        f.id === fileId ? { ...f, progress: 0, failed: false } : f
      );
      this.uploadedFiles.set(updatedFiles);
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
    this.selectedFile.set(null);
    this.mediaPreview.set(null);
    this.uploadedMediaId.set(null);
    this.isVideo.set(false);
    
    // CRITICAL: Clearing mediaPreview signal will trigger step1Valid to recalculate
    // The computed signal will automatically detect the change and update
    // No need to manually trigger validation - the signal reactivity handles it
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
          // Save draft with updated media URL and type
          this.saveStep1ToDraft();
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



  canGoToNextStep(): boolean {
    const current = this.currentStep();
    if (current === 1) {
      // Step 1: Caption AND media must be present
      // step1Valid computed signal automatically tracks contentValue and mediaPreview
      const isValid = this.step1Valid();
      
      // If content is provided, validate it doesn't exceed max length
      const contentValue = this.contentValue();
      const trimmedContent = contentValue.trim();
      const isContentLengthValid = trimmedContent.length === 0 || trimmedContent.length <= 4000;
      
      // Return true only if validation passes
      return isValid && isContentLengthValid;
    }
    if (current === 2) {
      // Step 2: Select Platforms - at least one platform must be selected
      // Step 2 can only proceed if Step 1 is completed
      if (!this.step1Completed()) {
        return false;
      }
      const draft = this.postDraftService.getActiveDraft();
      const hasPlatforms = (draft?.selectedPlatforms?.length ?? 0) > 0;
      
      return hasPlatforms;
    }
    if (current === 3) {
      // Step 3: Crop/Edit - can proceed if Step 2 is completed
      // Step 3 allows proceeding (user can adjust crops for all platforms)
      if (!this.step2Completed()) {
        return false;
      }
      return true;
    }
    if (current === 4) {
      // Step 4: Preview - can proceed if Step 3 is completed
      if (!this.step3Completed()) {
        return false;
      }
      return true;
    }
    if (current === 5) {
      // Step 5: Publish/Schedule - can proceed if Step 4 is completed AND platforms are selected
      if (!this.step4PreviewLoaded()) {
        return false;
      }
      // Verify platforms are selected from draft
      const draft = this.postDraftService.getActiveDraft();
      const hasPlatforms = (draft?.selectedPlatforms?.length ?? 0) > 0;
      return hasPlatforms;
    }
    return false;
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
    const mediaUrl = this.mediaPreview();
    // Use isVideo signal for more reliable detection
    const mediaType = mediaUrl ? (this.isVideo() ? 'video' : 'image') : undefined;
    
    this.postDraftService.updateDraft({
      caption: content,
      mediaUrl: mediaUrl || undefined,
      mediaType: mediaType,
    });
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
    const platformCropConfigs = this.platformCropConfigs();
    const platformCroppedImages = this.platformCroppedImages();
    const platformCaptions = this.platformCaptions();
    
    this.postDraftService.updateDraft({
      platformCropConfigs,
      platformCroppedImages: Object.keys(platformCroppedImages).length > 0 ? platformCroppedImages : undefined,
      platformCaptions,
    });
  }

  /**
   * Handle crop configs change from photo-crop component
   */
  onCropConfigsChange(configs: Record<Platform, { crop: { zoom: number; offsetX: number; offsetY: number }; cropBox: { width: number; height: number; left: number; top: number } }>): void {
    this.platformCropConfigs.set(configs);
    // Auto-save to draft when crop changes
    this.saveStep3ToDraft();
  }

  /**
   * Handle cropped images change from photo-crop component
   */
  onCroppedImagesChange(croppedImages: Record<Platform, string>): void {
    this.platformCroppedImages.set(croppedImages);
    // Auto-save to draft when cropped images change
    this.saveStep3ToDraft();
  }
  
  /**
   * Detect media type from URL
   */
  detectedMediaType(): 'image' | 'video' | null {
    const url = this.mediaPreview();
    if (!url) return null;
    const ext = url.split('.').pop()?.toLowerCase();
    if (['mp4', 'mov', 'webm', 'avi'].includes(ext || '')) {
      return 'video';
    }
    return 'image';
  }

  canGoToStep(step: number): boolean {
    // Can go to previous steps
    if (step <= this.currentStep()) {
      return true;
    }
    // Can only go forward if all previous steps are completed
    if (step > this.currentStep()) {
      // Check all previous steps are complete
    for (let i = 1; i < step; i++) {
        if (!this.isStepComplete(i)) {
        return false;
      }
      }
    }
    return true;
  }

  /**
   * Check if a step is completed
   * Steps show checkmark ONLY after they are explicitly completed (by clicking Next)
   */
  isStepComplete(step: number): boolean {
    switch (step) {
      case 1:
        // Step 1 shows checkmark ONLY after clicking Next and moving to Step 2
        return this.step1Completed();
      case 2:
        // Step 2 shows checkmark ONLY after clicking Next and moving to Step 3
        return this.step2Completed();
      case 3:
        // Step 3 shows checkmark ONLY after clicking Next and moving to Step 4
        return this.step3Completed();
      case 4:
        // Step 4 shows checkmark ONLY after clicking Next and moving to Step 5
        return this.step4PreviewLoaded();
      case 5:
        // Step 5 shows checkmark only after publish/schedule is completed
        return this.step5Completed();
      default:
        return false;
    }
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
    return ['facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'tiktok', 'pinterest'];
  }
  
  /**
   * Check if a platform is selected
   */
  isPlatformSelected(platform: Platform): boolean {
    const draft = this.postDraftService.getActiveDraft();
    return draft?.selectedPlatforms?.includes(platform) || false;
  }
  
  /**
   * Toggle platform selection
   */
  togglePlatform(platform: Platform): void {
    const draft = this.postDraftService.getActiveDraft();
    if (!draft) return;
    
    const currentPlatforms = draft.selectedPlatforms || [];
    const isSelected = currentPlatforms.includes(platform);
    
    const newPlatforms = isSelected
      ? currentPlatforms.filter(p => p !== platform)
      : [...currentPlatforms, platform];
    
    this.postDraftService.updateSelectedPlatforms(newPlatforms);
    
    // Clear validation error when a platform is selected
    if (newPlatforms.length > 0) {
      this.step2ValidationError.set(false);
    }
  }

  /**
   * Get connected accounts for a specific platform
   */
  getConnectedAccountsForPlatform(platform: Platform): SocialAccount[] {
    return this.socialAccounts().filter(acc => acc.platform === platform && acc.status === 'connected');
  }

  /**
   * Get account IDs from selected platforms in draft
   * This converts the platform selections from Step 2 into actual account IDs
   */
  getAccountIdsFromSelectedPlatforms(): string[] {
    const draft = this.postDraftService.getActiveDraft();
    const selectedPlatforms = draft?.selectedPlatforms || [];
    
    if (selectedPlatforms.length === 0) {
      return [];
    }

    // Get all connected accounts for the selected platforms
    const accountIds: string[] = [];
    selectedPlatforms.forEach((platform) => {
      const accounts = this.getConnectedAccountsForPlatform(platform);
      accounts.forEach((account) => {
        if (!accountIds.includes(account.id)) {
          accountIds.push(account.id);
        }
      });
    });

    return accountIds;
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
        // Clear any previous errors
      },
      error: (error) => {
        console.error('Failed to create client', error);
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
    if (this.postForm.invalid) {
      this.markFormGroupTouched(this.postForm);
      return;
    }

    this.saving.set(true);

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

    // Check if platforms are selected from draft
    const draft = this.postDraftService.getActiveDraft();
    const hasPlatforms = (draft?.selectedPlatforms?.length ?? 0) > 0;
    if (!hasPlatforms) {
      this.toastService.warning('Please select at least one platform');
      return;
    }

    this.saving.set(true);

    const user = this.authService.user();
    if (!user || !user.tenantId) {
      this.toastService.error('User not authenticated');
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
              this.toastService.warning('Client selection is required for agencies');
              this.saving.set(false);
              return;
            }
            // Continue with the rest of publish logic
            this.continuePublish(formValue, activeClient);
          },
          error: () => {
            this.toastService.error('Failed to load clients. Please try again.');
            this.saving.set(false);
          }
        });
        return;
      }

      const activeClient = this.clientsService.getSelectedClient();

      if (!activeClient) {
        this.toastService.warning('Client selection is required for agencies');
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
      this.toastService.error('User not authenticated');
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
        // Get account IDs from selected platforms (Step 2)
        const accountIds = this.getAccountIdsFromSelectedPlatforms();
        
        if (accountIds.length === 0) {
          this.toastService.warning('No connected accounts found for selected platforms');
          this.saving.set(false);
          return throwError(() => new Error('No connected accounts found for selected platforms'));
        }

        // Get platform crop configs and cropped images from draft
        // Ensure we have the absolute latest data by saving Step 3 one more time
        this.saveStep3ToDraft();
        const draft = this.postDraftService.getActiveDraft();
        const platformCropConfigs = draft?.platformCropConfigs || this.platformCropConfigs();
        const platformCroppedImages = draft?.platformCroppedImages || this.platformCroppedImages();
        
        // For videos, use the original uploaded media (videos cannot be cropped)
        if (this.isVideo() || draft?.mediaType === 'video') {
          // Use the already uploaded media ID for videos
          const request = this.isEditMode() 
            ? {
                content: formValue.content,
                mediaId: mediaId,
                socialAccountIds: accountIds,
                scheduledAt: undefined,
                platformCropConfigs: undefined, // No crop configs for videos
              }
            : {
                clientId: activeClient.id,
                createdByTeamMemberId: user.userId,
                content: formValue.content,
                mediaId: mediaId,
                socialAccountIds: accountIds,
                scheduledAt: undefined,
                platformCropConfigs: undefined, // No crop configs for videos
              };
          
          const apiCall = this.isEditMode()
            ? this.postsService.updatePost(this.postId()!, request as UpdatePostRequest)
            : this.postsService.createPost(request as CreatePostRequest);
          
          return apiCall;
        }
        
        // For images, upload cropped images for each platform and get mediaIds
        // For now, we'll use the first platform's cropped image as the main mediaId
        // In the future, this could be expanded to support per-platform media
        const selectedPlatforms = draft?.selectedPlatforms || [];
        let croppedMediaId = mediaId;
        
        // CRITICAL: Always use cropped images for publishing to ensure published post matches preview
        // Generate crops if they don't exist yet (shouldn't happen, but safety check)
        if (selectedPlatforms.length > 0) {
          const firstPlatform = selectedPlatforms[0];
          let croppedImageBase64 = platformCroppedImages?.[firstPlatform];
          
          // If no cropped image exists, generate it now (shouldn't happen if Step 4 was completed)
          if (!croppedImageBase64 && this.photoCropComponent) {
            console.warn('Cropped image not found - generating now before publishing');
            // Wait for crop generation before proceeding
            return new Observable<SocialPost>((observer) => {
              this.photoCropComponent!.cropImageForPlatform(firstPlatform).then((cropped) => {
                if (cropped) {
                  // Update draft with generated crop
                  const updatedCropped = { ...platformCroppedImages };
                  updatedCropped[firstPlatform] = cropped;
                  this.platformCroppedImages.set(updatedCropped);
                  this.saveStep3ToDraft();
                  
                  // Upload and publish with cropped image
                  const file = this.base64ToFile(cropped, `cropped-${firstPlatform}.png`);
                  this.mediaService.uploadMedia(file).subscribe({
                    next: (mediaResponse) => {
                      const request = this.isEditMode() 
                        ? {
                            content: formValue.content,
                            mediaId: mediaResponse.mediaId,
                            socialAccountIds: accountIds,
                            scheduledAt: undefined,
                            platformCropConfigs: Object.keys(platformCropConfigs).length > 0 ? platformCropConfigs : undefined,
                          }
                        : {
                            clientId: activeClient.id,
                            createdByTeamMemberId: user.userId,
                            content: formValue.content,
                            mediaId: mediaResponse.mediaId,
                            socialAccountIds: accountIds,
                            scheduledAt: undefined,
                            platformCropConfigs: Object.keys(platformCropConfigs).length > 0 ? platformCropConfigs : undefined,
                          };
                      
                      const apiCall = this.isEditMode()
                        ? this.postsService.updatePost(this.postId()!, request as UpdatePostRequest)
                        : this.postsService.createPost(request as CreatePostRequest);
                      
                      apiCall.subscribe(observer);
                    },
                    error: (err) => observer.error(err)
                  });
                } else {
                  observer.error(new Error('Failed to generate cropped image'));
                }
              }).catch((err) => observer.error(err));
            });
          }
          
          if (croppedImageBase64) {
            // Convert base64 to File and upload
            const file = this.base64ToFile(croppedImageBase64, `cropped-${firstPlatform}.png`);
            return this.mediaService.uploadMedia(file).pipe(
              switchMap((mediaResponse) => {
                croppedMediaId = mediaResponse.mediaId;
                
        if (this.isEditMode()) {
          const updateRequest: UpdatePostRequest = {
            content: formValue.content,
                    mediaId: croppedMediaId,
                    socialAccountIds: accountIds,
            scheduledAt: undefined,
                    platformCropConfigs: Object.keys(platformCropConfigs).length > 0 ? platformCropConfigs : undefined,
          };
          return this.postsService.updatePost(this.postId()!, updateRequest);
        } else {
          const createRequest: CreatePostRequest = {
            clientId: activeClient.id,
            createdByTeamMemberId: user.userId,
            content: formValue.content,
                    mediaId: croppedMediaId,
                    socialAccountIds: accountIds,
            scheduledAt: undefined,
                    platformCropConfigs: Object.keys(platformCropConfigs).length > 0 ? platformCropConfigs : undefined,
          };
          return this.postsService.createPost(createRequest);
        }
              })
            );
          }
        }
        
        // If no cropped images available and no way to generate them, show error
        this.toastService.warning('Cropped images not found. Please go back to Step 3 and complete cropping before publishing.');
        this.saving.set(false);
        return throwError(() => new Error('Cropped images required for publishing'));
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
              tap((response) => {
                console.log('PublishPost returned successfully:', response);
                // Store the message for display in the success handler
                if (response?.message) {
                  (post as any).publishMessage = response.message;
                }
              }),
              catchError((error) => {
                console.error('Error in publishPost observable:', error);
                return throwError(() => error);
              }),
              map((response) => {
                // Attach the publish response message to the post object
                (post as any).publishMessage = response.message;
                return post;
              })
            );
          })
        );
      })
    ).subscribe({
      next: (post) => {
        console.log('Publish flow completed successfully');
        this.saving.set(false);
        // Defer toast to avoid change detection errors
        setTimeout(() => {
          // Check if there's a detailed message from the backend (for partial success)
          const publishMessage = (post as any)?.publishMessage;
          if (publishMessage && publishMessage.includes('out of')) {
            // Partial success - show as info/warning with details
            if (publishMessage.includes('Failed to publish to')) {
              // Some platforms failed - show as warning
              this.toastService.warning('Partial Publishing Success', publishMessage);
            } else {
              // All succeeded or partial with details
              this.toastService.success('Post Published', publishMessage);
            }
          } else {
            // Full success
            this.toastService.success('Post published successfully!');
          }
        }, 0);
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
        // Extract error message - show the actual backend error
        let errorMsg = error?.userMessage || error?.error?.message || error?.message || 'Failed to publish post';
        
        // Log the full error for debugging
        console.error('Full error object:', {
          error,
          errorBody: error?.error,
          errorMessage: error?.error?.message,
          userMessage: error?.userMessage,
          status: error?.status,
          statusText: error?.statusText,
          url: error?.url
        });
        
        // Show the actual error message from backend
        // Only add helpful context if the error is generic
        let displayMessage = errorMsg;
        
        // Add helpful context for specific errors, but keep the original message
        if (errorMsg.includes('No Facebook pages available') || errorMsg.includes('Facebook pages')) {
          // Show the actual error, but add context
          displayMessage = `${errorMsg}\n\nTip: Make sure you have a Facebook Page (not just a personal profile) and granted 'pages_show_list' and 'pages_manage_posts' permissions when connecting.`;
        } else if (errorMsg.includes('Token expired') || errorMsg.includes('Unauthorized')) {
          displayMessage = `${errorMsg}\n\nTip: Your social media account connection may have expired. Try reconnecting in Settings → Social Accounts.`;
        }
        
        console.error('Displaying error message:', displayMessage);
        // Defer toast to avoid change detection errors
        setTimeout(() => {
          this.toastService.error(displayMessage);
        }, 0);
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
      this.toastService.warning('Please select a date and time for scheduling');
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

    // Create post with scheduled date
    this.createOrUpdatePost(true).subscribe({
      next: (post) => {
        // Schedule the post
        const scheduledAt = this.scheduledDateTime();
        if (!scheduledAt) {
          this.toastService.warning('Scheduled date/time is required');
          this.saving.set(false);
          return;
        }

        // Get account IDs from selected platforms (Step 2)
        const accountIds = this.getAccountIdsFromSelectedPlatforms();
        if (accountIds.length === 0) {
          this.toastService.warning('No connected accounts found for selected platforms');
          this.saving.set(false);
          return;
        }

        const scheduleRequest = {
          postId: post.id,
          scheduledAt: scheduledAt,
          socialAccountIds: accountIds,
        };

        this.postsService.schedulePost(post.id, scheduleRequest).subscribe({
          next: () => {
            // Defer toast to avoid change detection errors
            setTimeout(() => {
              this.toastService.success('Post scheduled successfully!');
            }, 0);
            this.router.navigate(['/dashboard/posts']);
          },
          error: (error) => {
            // Extract error message and provide user-friendly message for token expiration
            let errorMsg = error?.userMessage || error?.error?.message || error?.message || 'Failed to schedule post';
            
            // Check for Instagram Business Account error with more specific messaging
            if (errorMsg.includes('Instagram Business Account') || errorMsg.includes('Failed to get Instagram Business Account')) {
              if (errorMsg.includes('Unauthorized') || errorMsg.includes('401') || errorMsg.includes('400')) {
                errorMsg = 'Instagram publishing requires Facebook connection: Instagram Business accounts must be accessed through Facebook Graph API. To post to Instagram: 1) Connect Facebook (with a Facebook Page), 2) Make sure your Instagram Business account is linked to that Facebook Page in Instagram app, 3) Select only Facebook when posting (Instagram will be published automatically if linked). Do NOT connect Instagram separately - it will not work for Business accounts.';
              } else if (errorMsg.includes('not found')) {
                errorMsg = 'Instagram Business Account not linked: Your Instagram account is not linked to a Facebook Page. Please: 1) Go to Instagram app → Settings → Account → Linked Accounts, 2) Link your Instagram to a Facebook Page, 3) Then connect Facebook (with Page) in Settings → Social Accounts.';
              } else {
                errorMsg = 'Instagram Business Account setup issue: Your Instagram account must be a Business account (not Creator) and properly linked to a Facebook Page. Please check: 1) Instagram account type in Instagram app, 2) Facebook Page connection, 3) Connect Facebook (not Instagram) in Settings → Social Accounts.';
              }
            }
            // Check for Facebook Pages error
            if (errorMsg.includes('No Facebook pages available') || errorMsg.includes('Facebook pages')) {
              errorMsg = 'Facebook Page required: You need to connect a Facebook Page (not just a personal profile) to post. Facebook no longer allows posting to personal profiles via API. Please: 1) Create a Facebook Page if you don\'t have one, 2) Go to Settings → Social Accounts, 3) Connect Facebook and select your Page. Note: If your Instagram is linked to this Page, you can post to both Facebook and Instagram by selecting only Facebook.';
            }
            // Check if it's a token expiration error
            else if (errorMsg.includes('Token expired') || (errorMsg.includes('Unauthorized') && !errorMsg.includes('Instagram'))) {
              errorMsg = 'Your social media account connection has expired. Please reconnect your account in Settings to continue scheduling.';
            }
            
            // Defer toast to avoid change detection errors
            setTimeout(() => {
              this.toastService.error(errorMsg);
            }, 0);
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
    console.log('Saving post with crop configs:', JSON.stringify(platformCropConfigs, null, 2));

    if (this.isEditMode()) {
      // Update existing post
      const updateRequest: UpdatePostRequest = {
        content: formValue.content,
        mediaId: mediaId,
        socialAccountIds: accountIds.length > 0 ? accountIds : this.selectedAccountIds(),
        scheduledAt: isScheduled ? this.scheduledDateTime() : undefined,
        platformCropConfigs: Object.keys(platformCropConfigs).length > 0 ? platformCropConfigs : undefined,
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
        socialAccountIds: accountIds.length > 0 ? accountIds : this.selectedAccountIds(),
        scheduledAt: scheduledAt || undefined,
        platformCropConfigs: Object.keys(platformCropConfigs).length > 0 ? platformCropConfigs : undefined,
      };

      console.log('Create post request:', JSON.stringify(createRequest, null, 2));
      return this.postsService.createPost(createRequest).pipe(
        tap(() => {
          this.saving.set(false);
        }),
        catchError((error) => {
          this.toastService.error(error?.userMessage || 'Failed to save post');
          this.saving.set(false);
          return throwError(() => error);
        })
      );
    }
  }

  /**
   * Convert base64 string to File object
   */
  private base64ToFile(base64: string, filename: string): File {
    const arr = base64.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
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
