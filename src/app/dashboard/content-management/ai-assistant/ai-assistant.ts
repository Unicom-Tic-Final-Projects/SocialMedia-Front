import { Component, inject, signal, output } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AIService, GenerateCaptionResponse, BestTimeToPostResponse, GenerateImageResponse, GenerateContentPlanResponse } from '../../../services/client/ai.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { AIImageEditorComponent } from '../../ai-image-editor/ai-image-editor';

@Component({
  selector: 'app-ai-assistant',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, AIImageEditorComponent],
  templateUrl: './ai-assistant.html',
  styleUrl: './ai-assistant.css'
})
export class AIAssistantComponent {
  private readonly fb = inject(FormBuilder);
  private readonly aiService = inject(AIService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  contentGenerated = output<string>();

  // Active tab
  activeTab = signal<'captions' | 'content-plan' | 'best-time' | 'image' | 'image-editor'>('captions');

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
    this.captionForm = this.fb.group({
      topic: ['', [Validators.required, Validators.maxLength(500)]],
      context: ['', [Validators.maxLength(1000)]],
      platform: [''],
      captionCount: [3, [Validators.min(1), Validators.max(10)]],
      includeHashtags: [true],
      hashtagCount: [10, [Validators.min(1), Validators.max(30)]]
    });

    this.contentPlanForm = this.fb.group({
      topic: ['', [Validators.required, Validators.maxLength(500)]],
      businessContext: ['', [Validators.maxLength(2000)]],
      platform: [''],
      postsPerWeek: [5, [Validators.min(1), Validators.max(20)]],
      weeks: [4, [Validators.min(1), Validators.max(12)]]
    });

    this.imageForm = this.fb.group({
      prompt: ['', [Validators.required, Validators.maxLength(2000)]],
      style: [''],
      aspectRatio: ['1:1'],
      width: [1024],
      height: [1024]
    });
  }

  setActiveTab(tab: 'captions' | 'content-plan' | 'best-time' | 'image' | 'image-editor'): void {
    this.activeTab.set(tab);
  }

  // Use caption in post
  useCaption(caption: string, hashtags: string[]): void {
    const fullContent = caption + (hashtags.length > 0 ? '\n\n' + hashtags.join(' ') : '');
    this.contentGenerated.emit(fullContent);
  }

  // Use generated image
  useGeneratedImage(): void {
    const image = this.generatedImage();
    if (image?.imageUrl || image?.imageBase64) {
      // Navigate to post creator with image
      // This will be handled by parent component
    }
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
      hashtagCount: formValue.hashtagCount || 10
    };

    this.aiService.generateCaptions(request).subscribe({
      next: (response) => {
        this.aiCaptions.set(response);
        this.loading.set(false);
        this.toastService.success('Captions generated successfully!');
      },
      error: (error) => {
        const errorMsg = error?.error?.message || error?.message || 'Failed to generate captions. Please try again.';
        this.toastService.error(errorMsg);
        this.loading.set(false);
      }
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
    this.aiService.generateContentPlan({
      tenantId: user.tenantId,
      topic: formValue.topic,
      businessContext: formValue.businessContext || undefined,
      platform: formValue.platform || undefined,
      postsPerWeek: formValue.postsPerWeek || 5,
      weeks: formValue.weeks || 4
    }).subscribe({
      next: (response) => {
        this.contentPlan.set(response);
        this.loading.set(false);
        this.toastService.success('Content plan generated successfully!');
      },
      error: (error) => {
        this.toastService.error('Failed to generate content plan. Please try again.');
        this.loading.set(false);
      }
    });
  }

  loadBestTimeToPost(): void {
    const user = this.authService.user();
    if (!user || !user.tenantId) {
      return;
    }

    this.loading.set(true);
    this.aiService.getBestTimeToPost({
      tenantId: user.tenantId,
      userId: user.userId,
      lookbackDays: 30
    }).subscribe({
      next: (response) => {
        this.bestTimeToPost.set(response);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
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
    this.aiService.generateImage({
      tenantId: user.tenantId,
      prompt: formValue.prompt,
      style: formValue.style || undefined,
      aspectRatio: formValue.aspectRatio || undefined,
      width: formValue.width || undefined,
      height: formValue.height || undefined
    }).subscribe({
      next: (response) => {
        this.generatedImage.set(response);
        this.loading.set(false);
        this.toastService.success('Image generated successfully!');
      },
      error: (error) => {
        this.toastService.error('Failed to generate image. Please try again.');
        this.loading.set(false);
      }
    });
  }
}

