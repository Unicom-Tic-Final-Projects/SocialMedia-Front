import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AIService, EditImageRequest, EditImageResponse } from '../../services/client/ai.service';
import { AuthService } from '../../core/services/auth.service';

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
  styleUrl: './ai-image-editor.css'
})
export class AIImageEditorComponent {
  private fb = inject(FormBuilder);
  private aiService = inject(AIService);
  private authService = inject(AuthService);

  // Form
  editForm: FormGroup;

  // State
  originalImageUrl = signal<string | null>(null);
  originalImageBase64 = signal<string | null>(null);
  currentImageUrl = signal<string | null>(null);
  loading = signal(false);
  errorMessage = signal<string | null>(null);
  
  // Edit history
  editHistory = signal<EditHistoryItem[]>([]);
  currentHistoryIndex = signal<number>(-1);
  
  // Presets
  readonly presets = [
    { value: 'instagram-post', label: 'Instagram Post (1:1)', icon: 'fa-instagram', isBrand: true },
    { value: 'story', label: 'IG/TikTok Story (9:16)', icon: 'fa-mobile-screen-button', isBrand: false },
    { value: 'twitter-header', label: 'X (Twitter) Header (3:1)', icon: 'fa-x-twitter', isBrand: true },
    { value: 'facebook-post', label: 'Facebook Post (4:3)', icon: 'fa-facebook', isBrand: true },
    { value: 'desktop-wallpaper', label: 'Desktop Wallpaper (16:9)', icon: 'fa-desktop', isBrand: false },
    { value: 'magic-expand', label: 'Magic Expand', icon: 'fa-expand', isBrand: false }
  ];

  // Quick prompts
  readonly quickPrompts = [
    { text: 'make it vintage', icon: 'fa-film' },
    { text: 'remove background person', icon: 'fa-scissors' },
    { text: 'enhance colors', icon: 'fa-palette' },
    { text: 'add dramatic lighting', icon: 'fa-lightbulb' },
    { text: 'make it black and white', icon: 'fa-circle' },
    { text: 'add blur effect', icon: 'fa-droplet' },
    { text: 'increase saturation', icon: 'fa-paintbrush' },
    { text: 'add vintage filter', icon: 'fa-camera' }
  ];

  canUndo = computed(() => this.currentHistoryIndex() > 0);
  canRedo = computed(() => this.currentHistoryIndex() < this.editHistory().length - 1);
  canReset = computed(() => this.originalImageUrl() !== null && this.currentImageUrl() !== this.originalImageUrl());

  constructor() {
    this.editForm = this.fb.group({
      prompt: ['', [Validators.required, Validators.maxLength(2000)]],
      preset: ['']
    });
  }

  onImageUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      
      if (!file.type.startsWith('image/')) {
        this.errorMessage.set('Please upload a valid image file');
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
        this.errorMessage.set(null);
      };
      reader.readAsDataURL(file);
    }
  }

  useQuickPrompt(prompt: string): void {
    this.editForm.patchValue({ prompt });
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
      this.errorMessage.set('User not authenticated');
      return;
    }

    // Get aspect ratio description for the prompt
    const aspectRatioInfo = this.getPresetAspectRatioInfo(preset);
    if (!aspectRatioInfo) return; // Magic expand doesn't need regeneration

    this.loading.set(true);
    this.errorMessage.set(null);

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
      model: 'gemini-2.0-flash-exp'
    };

    console.log('[AI Image Editor] Regenerating image for preset:', preset);
    console.log('[AI Image Editor] Request details:', {
      tenantId: request.tenantId,
      prompt: request.prompt,
      preset: request.preset,
      aspectRatio: request.aspectRatio,
      width: request.width,
      height: request.height,
      imageUrlLength: request.imageUrl?.length || 0
    });

    this.aiService.editImage(request).subscribe({
      next: (response: EditImageResponse) => {
        console.log('[AI Image Editor] Image regenerated successfully:', response);
        
        // Convert base64 to data URL if needed
        let editedImageUrl: string;
        if (response.editedImageBase64) {
          editedImageUrl = `data:image/jpeg;base64,${response.editedImageBase64}`;
        } else if (response.editedImageUrl) {
          editedImageUrl = response.editedImageUrl;
        } else {
          this.errorMessage.set('No image data in response');
          this.loading.set(false);
          return;
        }

        // Update current image with regenerated version
        this.currentImageUrl.set(editedImageUrl);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('[AI Image Editor] Error regenerating image:', error);
        console.error('[AI Image Editor] Full error details:', {
          status: error?.status,
          statusText: error?.statusText,
          error: error?.error,
          message: error?.message,
          url: error?.url
        });
        
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
        
        this.errorMessage.set(errorMsg);
        this.loading.set(false);
      }
    });
  }

  getPresetAspectRatioInfo(preset: string): { aspectRatio: string; description: string; width?: number; height?: number } | null {
    switch (preset) {
      case 'instagram-post':
        return { aspectRatio: '1:1', description: 'square format', width: 1080, height: 1080 };
      case 'story':
        return { aspectRatio: '9:16', description: 'vertical story format', width: 1080, height: 1920 };
      case 'twitter-header':
        return { aspectRatio: '3:1', description: 'wide header format', width: 1500, height: 500 };
      case 'facebook-post':
        return { aspectRatio: '4:3', description: 'standard post format', width: 1200, height: 900 };
      case 'desktop-wallpaper':
        return { aspectRatio: '16:9', description: 'widescreen format', width: 1920, height: 1080 };
      case 'magic-expand':
        return null; // Magic expand doesn't need aspect ratio change
      default:
        return null;
    }
  }

  editImage(): void {
    if (this.editForm.invalid || !this.currentImageUrl()) {
      this.editForm.markAllAsTouched();
      return;
    }

    const user = this.authService.user();
    if (!user || !user.tenantId) {
      this.errorMessage.set('User not authenticated');
      return;
    }

    const imageUrl = this.currentImageUrl()!;
    const formValue = this.editForm.value;

    this.loading.set(true);
    this.errorMessage.set(null);

    const request: EditImageRequest = {
      tenantId: user.tenantId,
      prompt: formValue.prompt,
      imageUrl: imageUrl,
      preset: formValue.preset || undefined,
      model: 'gemini-2.0-flash-exp'
    };

    console.log('[AI Image Editor] Editing image with request:', request);

    this.aiService.editImage(request).subscribe({
      next: (response: EditImageResponse) => {
        console.log('[AI Image Editor] Image edited successfully:', response);
        
        // Convert base64 to data URL if needed
        let editedImageUrl: string;
        if (response.editedImageBase64) {
          editedImageUrl = `data:image/jpeg;base64,${response.editedImageBase64}`;
        } else if (response.editedImageUrl) {
          editedImageUrl = response.editedImageUrl;
        } else {
          this.errorMessage.set('No image data in response');
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
          timestamp: new Date(response.editedAt)
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
        this.loading.set(false);
      },
      error: (error) => {
        console.error('[AI Image Editor] Error editing image:', error);
        const errorMsg = error?.error?.message || error?.message || 'Failed to edit image. Please try again.';
        this.errorMessage.set(errorMsg);
        this.loading.set(false);
      }
    });
  }

  navigateHistory(direction: 'back' | 'forward'): void {
    const currentIndex = this.currentHistoryIndex();
    const history = this.editHistory();

    if (direction === 'back' && currentIndex > 0) {
      const newIndex = currentIndex - 1;
      this.currentHistoryIndex.set(newIndex);
      this.currentImageUrl.set(history[newIndex].imageUrl);
    } else if (direction === 'forward' && currentIndex < history.length - 1) {
      const newIndex = currentIndex + 1;
      this.currentHistoryIndex.set(newIndex);
      this.currentImageUrl.set(history[newIndex].imageUrl);
    }
  }

  goToHistoryItem(index: number): void {
    if (index >= 0 && index < this.editHistory().length) {
      this.currentHistoryIndex.set(index);
      this.currentImageUrl.set(this.editHistory()[index].imageUrl);
    }
  }

  resetToOriginal(): void {
    if (this.originalImageUrl()) {
      this.currentImageUrl.set(this.originalImageUrl()!);
      this.currentHistoryIndex.set(-1);
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
    this.errorMessage.set(null);
  }
}

