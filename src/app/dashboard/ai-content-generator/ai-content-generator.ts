import { Component, OnInit, inject, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  AIService,
  GenerateCaptionResponse,
  BestTimeToPostResponse,
  GenerateImageResponse,
  GenerateContentPlanResponse,
} from '../../services/client/ai.service';
import { PostsService } from '../../services/client/posts.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { CreatePostRequest } from '../../models/post.models';
import { AIImageEditorComponent } from '../ai-image-editor/ai-image-editor';
import { MediaService } from '../../services/client/media.service';
import { takeUntil } from 'rxjs/operators';
import { LoggingService } from '../../core/services/logging.service';
import { BaseComponent } from '../../core/base/base.component';
import { ClientContextService } from '../../services/client/client-context.service';

@Component({
  selector: 'app-ai-content-generator',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, CommonModule, AIImageEditorComponent],
  templateUrl: './ai-content-generator.html',
  styleUrl: './ai-content-generator.css',
})
export class AIContentGenerator extends BaseComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly aiService = inject(AIService);
  private readonly postsService = inject(PostsService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly loggingService = inject(LoggingService);
  private readonly mediaService = inject(MediaService);
  private readonly clientContextService = inject(ClientContextService);

  // Active tab
  activeTab = signal<'captions' | 'content-plan' | 'best-time' | 'image' | 'image-editor'>(
    'captions',
  );

  // Loading states
  loading = signal(false);

  // Caption generation
  captionForm!: FormGroup;
  aiCaptions = signal<GenerateCaptionResponse | null>(null);
  selectedCaption = signal<{ caption: string; hashtags: string[] } | null>(null);

  // Content plan
  contentPlanForm!: FormGroup;
  contentPlan = signal<GenerateContentPlanResponse | null>(null);

  // Best time to post
  bestTimeToPost = signal<BestTimeToPostResponse | null>(null);

  // Image generation
  imageForm!: FormGroup;
  generatedImage = signal<GenerateImageResponse | null>(null);

  // Post creation form
  postForm!: FormGroup;
  showPostCreator = signal(false);

  constructor() {
    super();
    // Initialize all forms in constructor to ensure they're available when template renders
    this.captionForm = this.fb.group({
      topic: ['', [Validators.required, Validators.maxLength(500)]],
      context: ['', [Validators.maxLength(1000)]],
      platform: [''],
      captionCount: [3, [Validators.min(1), Validators.max(10)]],
      includeHashtags: [true],
      hashtagCount: [10, [Validators.min(1), Validators.max(30)]],
    });

    this.contentPlanForm = this.fb.group({
      topic: ['', [Validators.required, Validators.maxLength(500)]],
      businessContext: ['', [Validators.maxLength(2000)]],
      platform: [''],
      postsPerWeek: [5, [Validators.min(1), Validators.max(20)]],
      weeks: [4, [Validators.min(1), Validators.max(12)]],
    });

    this.imageForm = this.fb.group({
      prompt: ['', [Validators.required, Validators.maxLength(2000)]],
      style: [''],
      aspectRatio: ['1:1'],
      width: [1024],
      height: [1024],
    });

    this.postForm = this.fb.group({
      content: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(4000)]],
      mediaUrl: [''],
    });
  }

  ngOnInit(): void {
    this.loadBestTimeToPost();
  }

  setActiveTab(tab: 'captions' | 'content-plan' | 'best-time' | 'image' | 'image-editor'): void {
    this.activeTab.set(tab);
  }

  // Caption Generation
  generateCaptions(): void {
    if (this.captionForm.invalid) {
      this.captionForm.markAllAsTouched();
      return;
    }

    const user = this.authService.user();
    if (!user || !user.tenantId) {
      this.toastService.error('User not authenticated');
      return;
    }

    this.loading.set(true);

    const formValue = this.captionForm.value;
    const request = {
      tenantId: user.tenantId,
      topic: formValue.topic,
      context: formValue.context || undefined,
      platform: formValue.platform || undefined,
      captionCount: formValue.captionCount || 3,
      includeHashtags: formValue.includeHashtags !== false,
      hashtagCount: formValue.hashtagCount || 10,
    };

    this.loggingService.debug('Generating captions with request', request, 'AIContentGenerator');

    this.aiService
      .generateCaptions(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loggingService.debug('Captions generated successfully', response, 'AIContentGenerator');
        this.aiCaptions.set(response);
        this.toastService.success('Captions generated successfully!');
        this.loading.set(false);
      },
      error: (error) => {
        this.loggingService.error('Error generating captions', error, 'AIContentGenerator');
        this.loggingService.error('Error details', {
          message: error?.message,
          error: error?.error,
          status: error?.status,
          statusText: error?.statusText,
          url: error?.url,
        });
        const errorMsg =
          error?.error?.message ||
          error?.message ||
          'Failed to generate captions. Please try again.';
        this.toastService.error(errorMsg);
        this.loading.set(false);
      },
    });
  }

  selectCaption(caption: string, hashtags: string[]): void {
    const hashtagText = hashtags.length > 0 ? '\n\n' + hashtags.join(' ') : '';
    const fullText = caption + hashtagText;
    this.selectedCaption.set({ caption, hashtags });
    this.postForm.patchValue({ content: fullText });
    this.showPostCreator.set(true);
  }

  // Content Plan
  generateContentPlan(): void {
    if (this.contentPlanForm.invalid) {
      this.contentPlanForm.markAllAsTouched();
      return;
    }

    const user = this.authService.user();
    if (!user || !user.tenantId) {
      this.toastService.error('User not authenticated');
      return;
    }

    this.loading.set(true);

    const formValue = this.contentPlanForm.value;
    this.aiService
      .generateContentPlan({
        tenantId: user.tenantId,
        topic: formValue.topic,
        businessContext: formValue.businessContext || undefined,
        platform: formValue.platform || undefined,
        postsPerWeek: formValue.postsPerWeek || 5,
        weeks: formValue.weeks || 4,
      })
      .subscribe({
        next: (response) => {
          this.contentPlan.set(response);
          this.toastService.success('Content plan generated successfully!');
          this.loading.set(false);
        },
        error: (_error) => {
          this.toastService.error('Failed to generate content plan. Please try again.');
          this.loading.set(false);
        },
      });
  }

  useContentPlanItem(item: any): void {
    const hashtagText =
      item.suggestedHashtags?.length > 0 ? '\n\n' + item.suggestedHashtags.join(' ') : '';
    const fullText = (item.suggestedCaption || item.description) + hashtagText;
    this.postForm.patchValue({ content: fullText });
    this.showPostCreator.set(true);
  }

  // Best Time to Post
  loadBestTimeToPost(): void {
    const user = this.authService.user();
    if (!user || !user.tenantId) {
      return;
    }

    this.loading.set(true);
    this.aiService
      .getBestTimeToPost({
        tenantId: user.tenantId,
        userId: user.userId,
        lookbackDays: 30,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.bestTimeToPost.set(response);
          this.loading.set(false);
        },
        error: (_error) => {
          this.loading.set(false);
          // Don't show error for best time, it's optional
        },
      });
  }

  // Image Generation
  generateImage(): void {
    if (this.imageForm.invalid) {
      this.imageForm.markAllAsTouched();
      return;
    }

    const user = this.authService.user();
    if (!user || !user.tenantId) {
      this.toastService.error('User not authenticated');
      return;
    }

    this.loading.set(true);

    const formValue = this.imageForm.value;
    this.aiService
      .generateImage({
        tenantId: user.tenantId,
        prompt: formValue.prompt,
        style: formValue.style || undefined,
        aspectRatio: formValue.aspectRatio || undefined,
        width: formValue.width || undefined,
        height: formValue.height || undefined,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.generatedImage.set(response);
          if (response.imageUrl) {
            this.postForm.patchValue({ mediaUrl: response.imageUrl });
          }
          this.toastService.success('Image generated successfully!');
          this.loading.set(false);
        },
        error: (_error) => {
          this.toastService.error('Failed to generate image. Please try again.');
          this.loading.set(false);
        },
      });
  }

  /**
   * Download the generated image
   */
  downloadGeneratedImage(): void {
    const image = this.generatedImage();
    if (!image) {
      this.toastService.error('No image to download');
      return;
    }

    try {
      let imageUrl = image.imageUrl;
      let imageData = image.imageBase64;

      // If we have base64 data, use it; otherwise use URL
      if (imageData) {
        // Convert base64 to blob
        const base64Data = imageData.startsWith('data:') 
          ? imageData.split(',')[1] 
          : imageData;
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/jpeg' });
        imageUrl = URL.createObjectURL(blob);
      }

      if (!imageUrl) {
        this.toastService.error('No image data available');
        return;
      }

      // Create download link
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `ai-generated-image-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up object URL if we created one
      if (imageData && imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrl);
      }

      this.toastService.success('Image downloaded successfully!');
    } catch (error) {
      this.loggingService.error('Error downloading image', error, 'AIContentGenerator');
      this.toastService.error('Failed to download image');
    }
  }

  /**
   * Add generated image to media library (upload to Cloudinary)
   */
  addToLibrary(): void {
    const image = this.generatedImage();
    if (!image) {
      this.toastService.error('No image to add to library');
      return;
    }

    const user = this.authService.user();
    if (!user || !user.tenantId) {
      this.toastService.error('User not authenticated');
      return;
    }

    this.loading.set(true);

    try {
      let imageData = image.imageBase64;
      let imageUrl = image.imageUrl;

      // If we have base64, convert to blob; otherwise fetch from URL
      let blob: Blob;
      
      if (imageData) {
        // Convert base64 to blob
        const base64Data = imageData.startsWith('data:') 
          ? imageData.split(',')[1] 
          : imageData;
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        blob = new Blob([byteArray], { type: 'image/jpeg' });
      } else if (imageUrl) {
        // Fetch image from URL and convert to blob
        fetch(imageUrl)
          .then((response) => response.blob())
          .then((fetchedBlob) => {
            this.uploadBlobToLibrary(fetchedBlob);
          })
          .catch((error) => {
            this.loggingService.error('Error fetching image for upload', error, 'AIContentGenerator');
            this.toastService.error('Failed to fetch image for upload');
            this.loading.set(false);
          });
        return;
      } else {
        this.toastService.error('No image data available');
        this.loading.set(false);
        return;
      }

      this.uploadBlobToLibrary(blob);
    } catch (error) {
      this.loggingService.error('Error preparing image for upload', error, 'AIContentGenerator');
      this.toastService.error('Failed to prepare image for upload');
      this.loading.set(false);
    }
  }

  /**
   * Upload blob to media library
   */
  private uploadBlobToLibrary(blob: Blob): void {
    // Create a File object from the blob
    const file = new File([blob], `ai-generated-${Date.now()}.jpg`, { type: 'image/jpeg' });

    this.mediaService
      .uploadMedia(file)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loading.set(false);
          this.toastService.success('Image added to library successfully!');
          this.loggingService.debug('Image uploaded to library', response, 'AIContentGenerator');
        },
        error: (error) => {
          this.loggingService.error('Error uploading image to library', error, 'AIContentGenerator');
          const errorMsg =
            error?.error?.message || error?.message || 'Failed to upload image to library';
          this.toastService.error(errorMsg);
          this.loading.set(false);
        },
      });
  }

  /**
   * Get the image source URL for display
   */
  getGeneratedImageSrc(): string {
    const image = this.generatedImage();
    if (!image) return '';

    // Prefer base64 if available
    if (image.imageBase64) {
      return image.imageBase64.startsWith('data:')
        ? image.imageBase64
        : `data:image/jpeg;base64,${image.imageBase64}`;
    }

    // Fallback to URL
    return image.imageUrl || '';
  }

  /**
   * Navigate to content management create tab with the generated image
   */
  useGeneratedImage(): void {
    const image = this.generatedImage();
    if (!image) {
      this.toastService.error('No image to use');
      return;
    }

    // Navigate to content management with image URL/base64
    const queryParams: any = { tab: 'create' };
    
    // Prefer base64 if available, otherwise use URL
    if (image.imageBase64) {
      const base64Data = image.imageBase64.startsWith('data:') 
        ? image.imageBase64 
        : `data:image/jpeg;base64,${image.imageBase64}`;
      queryParams.imageBase64 = encodeURIComponent(base64Data);
    } else if (image.imageUrl) {
      queryParams.mediaUrl = encodeURIComponent(image.imageUrl);
    }

    // Check if we're in agency-client context
    const clientId = this.clientContextService.getCurrentClientId();
    const isAgencyClient = this.authService.isAgency() && clientId;

    if (isAgencyClient) {
      this.router.navigate(['/agency/client', clientId, 'content-management'], { queryParams });
    } else {
      this.router.navigate(['/dashboard/content-management'], { queryParams });
    }
    this.toastService.success('Navigating to create post...');
  }

  // Post Creation
  saveAsDraft(): void {
    if (this.postForm.invalid) {
      this.postForm.markAllAsTouched();
      return;
    }

    const user = this.authService.user();
    if (!user || !user.tenantId) {
      this.toastService.error('User not authenticated');
      return;
    }

    this.loading.set(true);

    const formValue = this.postForm.value;
    const createRequest: CreatePostRequest = {
      clientId: user.tenantId, // For individual users, tenantId is used as clientId
      createdByTeamMemberId: user.userId,
      content: formValue.content,
      socialAccountIds: [], // Empty for draft
      scheduledAt: undefined,
    };

    this.postsService
      .createPost(createRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
      next: () => {
        this.loading.set(false);
        this.toastService.success('Draft saved successfully!');
        this.router.navigate(['/dashboard/posts']);
      },
      error: (_error) => {
        this.toastService.error('Failed to save draft. Please try again.');
        this.loading.set(false);
      },
    });
  }

  createPost(): void {
    if (this.postForm.invalid) {
      this.postForm.markAllAsTouched();
      return;
    }

    // Navigate to post editor with pre-filled content
    const formValue = this.postForm.value;
    const queryParams: any = { content: encodeURIComponent(formValue.content) };
    if (formValue.mediaUrl) {
      queryParams.mediaUrl = encodeURIComponent(formValue.mediaUrl);
    }

    // Check if we're in agency-client context
    const clientId = this.clientContextService.getCurrentClientId();
    const isAgencyClient = this.authService.isAgency() && clientId;

    if (isAgencyClient) {
      this.router.navigate(['/agency/client', clientId, 'content-management'], { queryParams: { ...queryParams, tab: 'create' } });
    } else {
      this.router.navigate(['/dashboard/content-management'], { queryParams: { ...queryParams, tab: 'create' } });
    }
    this.showPostCreator.set(false);
  }

  resetForms(): void {
    this.captionForm.reset({
      captionCount: 3,
      includeHashtags: true,
      hashtagCount: 10,
    });
    this.contentPlanForm.reset({
      postsPerWeek: 5,
      weeks: 4,
    });
    this.imageForm.reset({
      aspectRatio: '1:1',
      width: 1024,
      height: 1024,
    });
    this.postForm.reset();
    this.aiCaptions.set(null);
    this.contentPlan.set(null);
    this.generatedImage.set(null);
    this.selectedCaption.set(null);
    this.showPostCreator.set(false);
  }

}
