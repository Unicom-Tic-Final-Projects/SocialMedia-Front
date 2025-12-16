import { Component, inject, signal, output, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import {
  AIService,
  GenerateCaptionResponse,
  BestTimeToPostResponse,
  GenerateImageResponse,
  GenerateContentPlanResponse,
} from '../../../services/client/ai.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { MediaService } from '../../../services/client/media.service';
import { Router, ActivatedRoute } from '@angular/router';
import { ClientContextService } from '../../../services/client/client-context.service';
import { AIImageEditorComponent } from '../../ai-image-editor/ai-image-editor';
import { SavedContentService } from '../../../services/client/saved-content.service';
import { AIAssistantStateService } from '../../../services/client/ai-assistant-state.service';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';
import { LoggingService } from '../../../core/services/logging.service';
import { BaseComponent } from '../../../core/base/base.component';

@Component({
  selector: 'app-ai-assistant',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, AIImageEditorComponent],
  templateUrl: './ai-assistant.html',
  styleUrl: './ai-assistant.css',
})
export class AIAssistantComponent extends BaseComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly aiService = inject(AIService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly loggingService = inject(LoggingService);
  private readonly mediaService = inject(MediaService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly clientContextService = inject(ClientContextService);
  private readonly savedContentService = inject(SavedContentService);
  private readonly aiAssistantState = inject(AIAssistantStateService);

  contentGenerated = output<string>();

  // Active tab
  activeTab = signal<'captions' | 'content-plan' | 'best-time' | 'image' | 'image-editor'>(
    'captions',
  );

  // Loading states
  loading = signal(false);

  // Caption generation
  captionForm: FormGroup;
  aiCaptions = signal<GenerateCaptionResponse | null>(null);
  selectedCaption = signal<{ caption: string; hashtags: string[] } | null>(null);

  // Content plan
  contentPlanForm: FormGroup;
  contentPlan = signal<GenerateContentPlanResponse | null>(null);

  // Best time to post
  bestTimeToPost = signal<BestTimeToPostResponse | null>(null);

  // Image generation
  imageForm: FormGroup;
  generatedImage = signal<GenerateImageResponse | null>(null);

  constructor() {
    super();
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

    // Restore image form values if they exist
    const savedImageFormValues = this.aiAssistantState.imageFormValues();
    if (savedImageFormValues) {
      this.imageForm.patchValue(savedImageFormValues);
    }

    // Restore generated image if it exists
    const savedImage = this.aiAssistantState.generatedImage();
    if (savedImage) {
      this.generatedImage.set(savedImage);
    }

    // Restore caption form values if they exist
    const savedCaptionFormValues = this.aiAssistantState.captionFormValues();
    if (savedCaptionFormValues) {
      this.captionForm.patchValue(savedCaptionFormValues);
    }

    // Restore generated captions if they exist
    const savedCaptions = this.aiAssistantState.generatedCaptions();
    if (savedCaptions) {
      this.aiCaptions.set(savedCaptions);
    }

    // Restore content plan form values if they exist
    const savedContentPlanFormValues = this.aiAssistantState.contentPlanFormValues();
    if (savedContentPlanFormValues) {
      this.contentPlanForm.patchValue(savedContentPlanFormValues);
    }

    // Restore generated content plan if it exists
    const savedContentPlan = this.aiAssistantState.generatedContentPlan();
    if (savedContentPlan) {
      this.contentPlan.set(savedContentPlan);
    }
  }

  ngOnInit(): void {
    // Watch image form changes and save to state (debounce to avoid too many updates)
    this.imageForm.valueChanges
      .pipe(
        debounceTime(500),
        takeUntil(this.destroy$)
      )
      .subscribe((values) => {
        if (values.prompt || values.style || values.aspectRatio || values.width || values.height) {
          this.aiAssistantState.setImageFormValues({
            prompt: values.prompt || '',
            style: values.style || '',
            aspectRatio: values.aspectRatio || '1:1',
            width: values.width || 1024,
            height: values.height || 1024,
          });
        }
      });

    // Watch caption form changes and save to state
    this.captionForm.valueChanges
      .pipe(
        debounceTime(500),
        takeUntil(this.destroy$)
      )
      .subscribe((values) => {
        if (values.topic || values.context || values.platform) {
          this.aiAssistantState.setCaptionFormValues({
            topic: values.topic || '',
            context: values.context || '',
            platform: values.platform || '',
            captionCount: values.captionCount || 3,
            includeHashtags: values.includeHashtags !== false,
            hashtagCount: values.hashtagCount || 10,
          });
        }
      });

    // Watch content plan form changes and save to state
    this.contentPlanForm.valueChanges
      .pipe(
        debounceTime(500),
        takeUntil(this.destroy$)
      )
      .subscribe((values) => {
        if (values.topic || values.businessContext || values.platform) {
          this.aiAssistantState.setContentPlanFormValues({
            topic: values.topic || '',
            businessContext: values.businessContext || '',
            platform: values.platform || '',
            postsPerWeek: values.postsPerWeek || 5,
            weeks: values.weeks || 4,
          });
        }
      });
  }

  setActiveTab(tab: 'captions' | 'content-plan' | 'best-time' | 'image' | 'image-editor'): void {
    this.activeTab.set(tab);
  }

  // Use caption in post - navigate to create tab with content pre-filled
  useCaption(caption: string, hashtags: string[]): void {
    const fullContent = caption + (hashtags.length > 0 ? '\n\n' + hashtags.join(' ') : '');
    
    // Build query params with content
    const queryParams: any = { tab: 'create', content: encodeURIComponent(fullContent) };

    // Check if we're in agency-client context
    const clientId = this.clientContextService.getCurrentClientId();
    const isAgencyClient = this.authService.isAgency() && clientId;

    if (isAgencyClient) {
      // Navigate to agency-client content management
      this.router.navigate(['/agency/client', clientId, 'content-management'], { queryParams });
    } else {
      // Navigate to individual user content management
      this.router.navigate(['/dashboard/content-management'], { queryParams });
    }
    
    this.toastService.success('Navigating to create post...');
  }

  // Save caption to saved content
  saveCaption(caption: string, hashtags: string[]): void {
    const clientId = this.clientContextService.getCurrentClientId();
    
    this.savedContentService
      .saveCaption({
        caption,
        hashtags,
        clientId: clientId || undefined,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastService.success('Caption saved successfully!');
        },
        error: (error) => {
          this.loggingService.error('Failed to save caption', error, 'AIAssistant');
          const errorMsg =
            error?.error?.message || error?.message || 'Failed to save caption. Please try again.';
          this.toastService.error(errorMsg);
        },
      });
  }

  // Save content plan item
  saveContentPlanItem(item: any): void {
    const contentPlan = this.contentPlan();
    if (!contentPlan) {
      this.toastService.error('No content plan to save');
      return;
    }

    const clientId = this.clientContextService.getCurrentClientId();
    
    this.savedContentService
      .saveContentPlan({
        contentPlan,
        clientId: clientId || undefined,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastService.success('Content plan saved successfully!');
        },
        error: (error) => {
          this.loggingService.error('Failed to save content plan', error, 'AIAssistant');
          const errorMsg =
            error?.error?.message || error?.message || 'Failed to save content plan. Please try again.';
          this.toastService.error(errorMsg);
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
      this.loggingService.error('Error downloading image', error, 'AIAssistant');
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
            this.loggingService.error('Error fetching image for upload', error, 'AIAssistant');
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
      this.loggingService.error('Error preparing image for upload', error, 'AIAssistant');
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
          this.loggingService.debug('Image uploaded to library', response, 'AIAssistant');
        },
        error: (error) => {
          this.loggingService.error('Error uploading image to library', error, 'AIAssistant');
          const errorMsg =
            error?.error?.message || error?.message || 'Failed to upload image to library';
          this.toastService.error(errorMsg);
          this.loading.set(false);
        },
      });
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

    // Build query params with image data
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
      // Navigate to agency-client content management
      this.router.navigate(['/agency/client', clientId, 'content-management'], { queryParams });
    } else {
      // Navigate to individual user content management
      this.router.navigate(['/dashboard/content-management'], { queryParams });
    }
    
    this.toastService.success('Navigating to create post...');
  }

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

    // Save form values before generating
    this.aiAssistantState.setCaptionFormValues({
      topic: formValue.topic,
      context: formValue.context || '',
      platform: formValue.platform || '',
      captionCount: formValue.captionCount || 3,
      includeHashtags: formValue.includeHashtags !== false,
      hashtagCount: formValue.hashtagCount || 10,
    });

    this.aiService
      .generateCaptions(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
      next: (response) => {
        this.aiCaptions.set(response);
        // Save generated captions to state service
        this.aiAssistantState.setGeneratedCaptions(response);
        this.loading.set(false);
        this.toastService.success('Captions generated successfully!');
      },
      error: (error) => {
        const errorMsg =
          error?.error?.message ||
          error?.message ||
          'Failed to generate captions. Please try again.';
        this.toastService.error(errorMsg);
        this.loading.set(false);
      },
    });
  }

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
    
    // Save form values before generating
    this.aiAssistantState.setContentPlanFormValues({
      topic: formValue.topic,
      businessContext: formValue.businessContext || '',
      platform: formValue.platform || '',
      postsPerWeek: formValue.postsPerWeek || 5,
      weeks: formValue.weeks || 4,
    });

    this.aiService
      .generateContentPlan({
        tenantId: user.tenantId,
        topic: formValue.topic,
        businessContext: formValue.businessContext || undefined,
        platform: formValue.platform || undefined,
        postsPerWeek: formValue.postsPerWeek || 5,
        weeks: formValue.weeks || 4,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.contentPlan.set(response);
          // Save generated content plan to state service
          this.aiAssistantState.setGeneratedContentPlan(response);
          this.loading.set(false);
          this.toastService.success('Content plan generated successfully!');
        },
        error: (_error) => {
          this.toastService.error('Failed to generate content plan. Please try again.');
          this.loading.set(false);
        },
      });
  }

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
        error: () => {
          this.loading.set(false);
        },
      });
  }

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
    
    // Save form values before generating
    this.aiAssistantState.setImageFormValues({
      prompt: formValue.prompt,
      style: formValue.style || '',
      aspectRatio: formValue.aspectRatio || '1:1',
      width: formValue.width || 1024,
      height: formValue.height || 1024,
    });
    
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
          // Save generated image to state service
          this.aiAssistantState.setGeneratedImage(response);
          this.aiAssistantState.setImagePrompt(formValue.prompt);
          this.loading.set(false);
          this.toastService.success('Image generated successfully!');
        },
        error: (error) => {
          this.loading.set(false);
          console.error('[AIAssistant] Image generation error:', error);
          
          // Provide more specific error messages
          let errorMessage = 'Failed to generate image. ';
          
          if (error?.message) {
            if (error.message.includes('CORS') || error.message.includes('Access-Control')) {
              errorMessage += 'CORS error: The frontend domain may not be allowed. Please check CORS configuration.';
            } else if (error.message.includes('ERR_NAME_NOT_RESOLVED') || error.message.includes('Failed to fetch')) {
              errorMessage += 'Network error: Could not reach the API server. Please check your internet connection and API URL configuration.';
            } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
              errorMessage += 'Authentication error: Please log in again.';
            } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
              errorMessage += 'Permission denied: You may not have access to this feature.';
            } else if (error.message.includes('500') || error.message.includes('Internal Server Error')) {
              errorMessage += 'Server error: The API encountered an error. Please try again later.';
            } else {
              errorMessage += error.message;
            }
          } else {
            errorMessage += 'Please try again.';
          }
          
          this.toastService.error(errorMessage);
          this.loggingService.error('Failed to generate image', error, 'AIAssistantComponent');
        },
      });
  }

}
