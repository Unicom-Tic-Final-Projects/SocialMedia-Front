import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AIService, EditImageRequest, EditImageResponse } from '../../services/client/ai.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { MediaService } from '../../services/client/media.service';
import { Router } from '@angular/router';
import { ClientContextService } from '../../services/client/client-context.service';
import { AIAssistantStateService } from '../../services/client/ai-assistant-state.service';
import { takeUntil, debounceTime } from 'rxjs/operators';
import { LoggingService } from '../../core/services/logging.service';
import { BaseComponent } from '../../core/base/base.component';

interface EditHistoryItem {
  id: string;
  prompt: string;
  preset?: string;
  imageUrl: string;
  imageBase64?: string;
  timestamp: Date;
}

@Component({
  selector: 'app-ai-image-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './ai-image-editor.html',
  styleUrl: './ai-image-editor.css',
})
export class AIImageEditorComponent extends BaseComponent implements OnInit {
  private fb = inject(FormBuilder);
  private aiService = inject(AIService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private readonly loggingService = inject(LoggingService);
  private readonly mediaService = inject(MediaService);
  private readonly router = inject(Router);
  private readonly clientContextService = inject(ClientContextService);
  private readonly aiAssistantState = inject(AIAssistantStateService);

  // Form
  editForm: FormGroup;

  // State
  originalImageUrl = signal<string | null>(null);
  originalImageBase64 = signal<string | null>(null);
  currentImageUrl = signal<string | null>(null);
  loading = signal(false);

  // Edit history
  editHistory = signal<EditHistoryItem[]>([]);
  currentHistoryIndex = signal<number>(-1);

  // Presets
  readonly presets = [
    { value: 'instagram-post', label: 'Instagram Post (1:1)', icon: 'fa-instagram', isBrand: true },
    {
      value: 'story',
      label: 'IG/TikTok Story (9:16)',
      icon: 'fa-mobile-screen-button',
      isBrand: false,
    },
    {
      value: 'twitter-header',
      label: 'X (Twitter) Header (3:1)',
      icon: 'fa-x-twitter',
      isBrand: true,
    },
    { value: 'facebook-post', label: 'Facebook Post (4:3)', icon: 'fa-facebook', isBrand: true },
    {
      value: 'desktop-wallpaper',
      label: 'Desktop Wallpaper (16:9)',
      icon: 'fa-desktop',
      isBrand: false,
    },
    { value: 'magic-expand', label: 'Magic Expand', icon: 'fa-expand', isBrand: false },
  ];

  canUndo = computed(() => this.currentHistoryIndex() > 0);
  canRedo = computed(() => this.currentHistoryIndex() < this.editHistory().length - 1);
  canReset = computed(
    () => this.originalImageUrl() !== null && this.currentImageUrl() !== this.originalImageUrl(),
  );

  constructor() {
    super();
    this.editForm = this.fb.group({
      prompt: [''], // Optional - no validators needed since prompt input is removed
      preset: [''],
    });

    // Restore edit form values if they exist
    const savedEditFormValues = this.aiAssistantState.editFormValues();
    if (savedEditFormValues) {
      this.editForm.patchValue(savedEditFormValues);
    }

    // Restore image editor state if it exists
    const savedOriginalImageUrl = this.aiAssistantState.originalImageUrl();
    const savedOriginalImageBase64 = this.aiAssistantState.originalImageBase64();
    const savedCurrentImageUrl = this.aiAssistantState.currentImageUrl();
    const savedEditHistory = this.aiAssistantState.editHistory();
    const savedCurrentHistoryIndex = this.aiAssistantState.currentHistoryIndex();

    if (savedOriginalImageUrl || savedOriginalImageBase64) {
      this.originalImageUrl.set(savedOriginalImageUrl);
      this.originalImageBase64.set(savedOriginalImageBase64);
      this.currentImageUrl.set(savedCurrentImageUrl || savedOriginalImageUrl);
      this.editHistory.set(savedEditHistory);
      this.currentHistoryIndex.set(savedCurrentHistoryIndex);
    }
  }

  ngOnInit(): void {
    // Watch edit form changes and save to state (debounce to avoid too many updates)
    this.editForm.valueChanges
      .pipe(
        debounceTime(500),
        takeUntil(this.destroy$)
      )
      .subscribe((values) => {
        if (values.prompt || values.preset) {
          this.aiAssistantState.setEditFormValues({
            prompt: values.prompt || '',
            preset: values.preset || '',
          });
        }
      });
  }

  onImageUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];

      if (!file.type.startsWith('image/')) {
        this.toastService.error('Please upload a valid image file');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        this.originalImageUrl.set(result);
        this.originalImageBase64.set(result);
        this.currentImageUrl.set(result);
        this.editHistory.set([]);
        this.currentHistoryIndex.set(-1);
        
        // Save to state service
        this.aiAssistantState.setOriginalImage(result, result);
        this.aiAssistantState.setCurrentImageUrl(result);
        this.aiAssistantState.setEditHistory([]);
        this.aiAssistantState.setCurrentHistoryIndex(-1);
        
        this.toastService.success('Image uploaded successfully');
      };
      reader.readAsDataURL(file);
    }
  }

  selectPreset(preset: string): void {
    const previousPreset = this.editForm.get('preset')?.value;
    this.editForm.patchValue({ preset });

    // If preset changed and we have an image, regenerate it with AI to fit the aspect ratio
    if (this.currentImageUrl() && this.originalImageBase64() && previousPreset !== preset) {
      this.regenerateImageForPreset(preset);
    }
  }

  getImageClass(): string {
    const preset = this.editForm.get('preset')?.value;
    if (!preset) {
      return 'w-full h-auto max-h-[600px] object-contain';
    }

    // Return appropriate class based on preset aspect ratio
    // Use object-contain to show full image, AI will regenerate to fit the aspect ratio
    switch (preset) {
      case 'instagram-post':
        return 'w-full aspect-square object-contain max-h-[500px]';
      case 'story':
        return 'w-full aspect-[9/16] object-contain max-h-[600px]';
      case 'twitter-header':
        return 'w-full aspect-[3/1] object-contain max-h-[200px]';
      case 'facebook-post':
        return 'w-full aspect-[4/3] object-contain max-h-[500px]';
      case 'desktop-wallpaper':
        return 'w-full aspect-[16/9] object-contain max-h-[400px]';
      case 'magic-expand':
        return 'w-full h-auto max-h-[600px] object-contain';
      default:
        return 'w-full h-auto max-h-[600px] object-contain';
    }
  }

  regenerateImageForPreset(preset: string): void {
    if (!this.currentImageUrl() || !this.originalImageBase64()) return;

    const user = this.authService.user();
    if (!user || !user.tenantId) {
      this.toastService.error('User not authenticated');
      return;
    }

    // Get aspect ratio description for the prompt
    const aspectRatioInfo = this.getPresetAspectRatioInfo(preset);
    if (!aspectRatioInfo) return; // Magic expand doesn't need regeneration

    this.loading.set(true);

    // Create a prompt that tells AI to adjust image to aspect ratio while preserving all content
    const prompt = `Adjust this image to ${aspectRatioInfo.aspectRatio} aspect ratio (${aspectRatioInfo.description}). Preserve all the original image content. Intelligently expand or adjust the image to fit the new aspect ratio without cropping or cutting any content. Fill any new areas naturally and seamlessly.`;

    // Use original base64 image to avoid issues with modified images
    const imageUrl = this.originalImageBase64() || this.currentImageUrl()!;

    const request: EditImageRequest = {
      tenantId: user.tenantId,
      prompt: prompt,
      imageUrl: imageUrl,
      preset: preset,
      aspectRatio: aspectRatioInfo.aspectRatio,
      width: aspectRatioInfo.width,
      height: aspectRatioInfo.height,
      model: 'gemini-2.0-flash-exp',
    };

    this.loggingService.debug('Regenerating image for preset', { preset, request: { ...request, imageUrlLength: request.imageUrl?.length || 0 } }, 'AIImageEditor');

    this.aiService
      .editImage(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: EditImageResponse) => {
          this.loggingService.debug('Image regenerated successfully', response, 'AIImageEditor');

        // Convert base64 to data URL if needed
        let editedImageUrl: string;
        if (response.editedImageBase64) {
          editedImageUrl = `data:image/jpeg;base64,${response.editedImageBase64}`;
        } else if (response.editedImageUrl) {
          editedImageUrl = response.editedImageUrl;
        } else {
          this.toastService.error('No image data in response');
          this.loading.set(false);
          return;
        }

        // Update current image with regenerated version
        this.currentImageUrl.set(editedImageUrl);
        
        // Save to state service
        this.aiAssistantState.setCurrentImageUrl(editedImageUrl);
        
        this.toastService.success('Image regenerated successfully!');
        this.loading.set(false);
      },
      error: (error) => {
        this.loggingService.error('Error regenerating image', error, 'AIImageEditor');
        this.loggingService.error('Full error details', {
          status: error?.status,
          statusText: error?.statusText,
          error: error?.error,
          message: error?.message,
          url: error?.url,
        }, 'AIImageEditor');

        let errorMsg = 'Failed to regenerate image. Please try again.';
        if (error?.error) {
          if (typeof error.error === 'string') {
            errorMsg = error.error;
          } else if (error.error?.message) {
            errorMsg = error.error.message;
          } else if (error.error?.Message) {
            errorMsg = error.error.Message;
          }
        } else if (error?.message) {
          errorMsg = error.message;
        }

        this.toastService.error(errorMsg);
        this.loading.set(false);
      },
    });
  }

  getPresetAspectRatioInfo(
    preset: string,
  ): { aspectRatio: string; description: string; width?: number; height?: number } | null {
    switch (preset) {
      case 'instagram-post':
        return { aspectRatio: '1:1', description: 'square format', width: 1080, height: 1080 };
      case 'story':
        return {
          aspectRatio: '9:16',
          description: 'vertical story format',
          width: 1080,
          height: 1920,
        };
      case 'twitter-header':
        return { aspectRatio: '3:1', description: 'wide header format', width: 1500, height: 500 };
      case 'facebook-post':
        return {
          aspectRatio: '4:3',
          description: 'standard post format',
          width: 1200,
          height: 900,
        };
      case 'desktop-wallpaper':
        return { aspectRatio: '16:9', description: 'widescreen format', width: 1920, height: 1080 };
      case 'magic-expand':
        return null; // Magic expand doesn't need aspect ratio change
      default:
        return null;
    }
  }

  editImage(): void {
    if (!this.currentImageUrl()) {
      this.toastService.error('Please upload an image first');
      return;
    }

    const user = this.authService.user();
    if (!user || !user.tenantId) {
      this.toastService.error('User not authenticated');
      return;
    }

    const imageUrl = this.currentImageUrl()!;
    const formValue = this.editForm.value;

    // Generate default prompt based on preset if no prompt is provided
    let prompt = formValue.prompt || '';
    if (!prompt || prompt.trim() === '') {
      const preset = formValue.preset;
      if (preset) {
        const presetInfo = this.getPresetAspectRatioInfo(preset);
        if (presetInfo) {
          prompt = `Adjust this image to ${presetInfo.aspectRatio} aspect ratio (${presetInfo.description}). Preserve all the original image content. Intelligently expand or adjust the image to fit the new aspect ratio without cropping or cutting any content. Fill any new areas naturally and seamlessly.`;
        } else {
          prompt = 'Enhance and optimize this image for the selected preset format.';
        }
      } else {
        prompt = 'Enhance and optimize this image.';
      }
    }

    this.loading.set(true);

    const request: EditImageRequest = {
      tenantId: user.tenantId,
      prompt: prompt,
      imageUrl: imageUrl,
      preset: formValue.preset || undefined,
      model: 'gemini-2.0-flash-exp',
    };

    this.loggingService.debug('Editing image with request', request, 'AIImageEditor');

    this.aiService
      .editImage(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: EditImageResponse) => {
          this.loggingService.debug('Image edited successfully', response, 'AIImageEditor');

        // Convert base64 to data URL if needed
        let editedImageUrl: string;
        if (response.editedImageBase64) {
          editedImageUrl = `data:image/jpeg;base64,${response.editedImageBase64}`;
        } else if (response.editedImageUrl) {
          editedImageUrl = response.editedImageUrl;
        } else {
          this.toastService.error('No image data in response');
          this.loading.set(false);
          return;
        }

        // Add to history
        const historyItem: EditHistoryItem = {
          id: response.id,
          prompt: formValue.prompt,
          preset: formValue.preset,
          imageUrl: editedImageUrl,
          imageBase64: response.editedImageBase64,
          timestamp: new Date(response.editedAt),
        };

        const newHistory = [...this.editHistory()];
        // Remove any items after current index (if we're not at the end)
        if (this.currentHistoryIndex() < newHistory.length - 1) {
          newHistory.splice(this.currentHistoryIndex() + 1);
        }
        newHistory.push(historyItem);

        this.editHistory.set(newHistory);
        this.currentHistoryIndex.set(newHistory.length - 1);
        this.currentImageUrl.set(editedImageUrl);
        
        // Save to state service
        this.aiAssistantState.setEditHistory(newHistory);
        this.aiAssistantState.setCurrentHistoryIndex(newHistory.length - 1);
        this.aiAssistantState.setCurrentImageUrl(editedImageUrl);
        
        this.toastService.success('Image edited successfully!');
        this.loading.set(false);
      },
      error: (error) => {
        this.loggingService.error('Error editing image', error, 'AIImageEditor');
        const errorMsg =
          error?.error?.message || error?.message || 'Failed to edit image. Please try again.';
        this.toastService.error(errorMsg);
        this.loading.set(false);
      },
    });
  }

  navigateHistory(direction: 'back' | 'forward'): void {
    const currentIndex = this.currentHistoryIndex();
    const history = this.editHistory();

    if (direction === 'back' && currentIndex > 0) {
      const newIndex = currentIndex - 1;
      this.currentHistoryIndex.set(newIndex);
      this.currentImageUrl.set(history[newIndex].imageUrl);
      // Save to state service
      this.aiAssistantState.setCurrentHistoryIndex(newIndex);
      this.aiAssistantState.setCurrentImageUrl(history[newIndex].imageUrl);
    } else if (direction === 'forward' && currentIndex < history.length - 1) {
      const newIndex = currentIndex + 1;
      this.currentHistoryIndex.set(newIndex);
      this.currentImageUrl.set(history[newIndex].imageUrl);
      // Save to state service
      this.aiAssistantState.setCurrentHistoryIndex(newIndex);
      this.aiAssistantState.setCurrentImageUrl(history[newIndex].imageUrl);
    }
  }

  goToHistoryItem(index: number): void {
    if (index >= 0 && index < this.editHistory().length) {
      this.currentHistoryIndex.set(index);
      this.currentImageUrl.set(this.editHistory()[index].imageUrl);
      // Save to state service
      this.aiAssistantState.setCurrentHistoryIndex(index);
      this.aiAssistantState.setCurrentImageUrl(this.editHistory()[index].imageUrl);
    }
  }

  resetToOriginal(): void {
    if (this.originalImageUrl()) {
      this.currentImageUrl.set(this.originalImageUrl()!);
      this.currentHistoryIndex.set(-1);
      // Save to state service
      this.aiAssistantState.setCurrentImageUrl(this.originalImageUrl()!);
      this.aiAssistantState.setCurrentHistoryIndex(-1);
    }
  }

  downloadImage(): void {
    const imageUrl = this.currentImageUrl();
    if (!imageUrl) return;

    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `edited-image-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  clearImage(): void {
    this.originalImageUrl.set(null);
    this.originalImageBase64.set(null);
    this.currentImageUrl.set(null);
    this.editHistory.set([]);
    this.currentHistoryIndex.set(-1);
    this.editForm.reset();
    
    // Clear state service
    this.aiAssistantState.clearImageEditorState();
  }

  /**
   * Add edited image to media library (upload to Cloudinary)
   */
  addToLibrary(): void {
    const imageUrl = this.currentImageUrl();
    if (!imageUrl) {
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
      let imageData = imageUrl;
      let blob: Blob;

      // If it's a data URL, convert to blob; otherwise fetch from URL
      if (imageData.startsWith('data:')) {
        // Convert base64 to blob
        const base64Data = imageData.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        blob = new Blob([byteArray], { type: 'image/jpeg' });
      } else {
        // Fetch image from URL and convert to blob
        fetch(imageUrl)
          .then((response) => response.blob())
          .then((fetchedBlob) => {
            this.uploadBlobToLibrary(fetchedBlob);
          })
          .catch((error) => {
            this.loggingService.error('Error fetching image for upload', error, 'AIImageEditor');
            this.toastService.error('Failed to fetch image for upload');
            this.loading.set(false);
          });
        return;
      }

      this.uploadBlobToLibrary(blob);
    } catch (error) {
      this.loggingService.error('Error preparing image for upload', error, 'AIImageEditor');
      this.toastService.error('Failed to prepare image for upload');
      this.loading.set(false);
    }
  }

  /**
   * Upload blob to media library
   */
  private uploadBlobToLibrary(blob: Blob): void {
    // Create a File object from the blob
    const file = new File([blob], `ai-edited-image-${Date.now()}.jpg`, { type: 'image/jpeg' });

    this.mediaService
      .uploadMedia(file)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loading.set(false);
          this.toastService.success('Image added to library successfully!');
          this.loggingService.debug('Image uploaded to library', response, 'AIImageEditor');
        },
        error: (error) => {
          this.loggingService.error('Error uploading image to library', error, 'AIImageEditor');
          const errorMsg =
            error?.error?.message || error?.message || 'Failed to upload image to library';
          this.toastService.error(errorMsg);
          this.loading.set(false);
        },
      });
  }

  /**
   * Navigate to content management create tab with the edited image
   */
  useEditedImage(): void {
    const imageUrl = this.currentImageUrl();
    if (!imageUrl) {
      this.toastService.error('No image to use');
      return;
    }

    // Build query params with image data
    const queryParams: any = { tab: 'create' };
    
    // Prefer base64 if available, otherwise use URL
    if (imageUrl.startsWith('data:')) {
      queryParams.imageBase64 = encodeURIComponent(imageUrl);
    } else {
      queryParams.mediaUrl = encodeURIComponent(imageUrl);
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

}
