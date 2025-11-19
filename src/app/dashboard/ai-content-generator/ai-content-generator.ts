import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AIService, GenerateCaptionResponse, BestTimeToPostResponse, GenerateImageResponse, GenerateContentPlanResponse } from '../../services/client/ai.service';
import { PostsService } from '../../services/client/posts.service';
import { AuthService } from '../../core/services/auth.service';
import { CreatePostRequest } from '../../models/post.models';
import { AIImageEditorComponent } from '../ai-image-editor/ai-image-editor';

@Component({
  selector: 'app-ai-content-generator',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, CommonModule, AIImageEditorComponent],
  templateUrl: './ai-content-generator.html',
  styleUrl: './ai-content-generator.css',
})
export class AIContentGenerator implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly aiService = inject(AIService);
  private readonly postsService = inject(PostsService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  // Active tab
  activeTab = signal<'captions' | 'content-plan' | 'best-time' | 'image' | 'image-editor'>('captions');

  // Loading states
  loading = signal(false);
  errorMessage = signal<string | null>(null);

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

  // Post creation form
  postForm: FormGroup;
  showPostCreator = signal(false);

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

    this.postForm = this.fb.group({
      content: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(4000)]],
      mediaUrl: ['']
    });
  }

  ngOnInit(): void {
    this.loadBestTimeToPost();
  }

  setActiveTab(tab: 'captions' | 'content-plan' | 'best-time' | 'image' | 'image-editor'): void {
    this.activeTab.set(tab);
    this.errorMessage.set(null);
  }

  // Caption Generation
  generateCaptions(): void {
    if (this.captionForm.invalid) {
      this.captionForm.markAllAsTouched();
      return;
    }

    const user = this.authService.user();
    if (!user || !user.tenantId) {
      this.errorMessage.set('User not authenticated');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

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

    console.log('[AI Content Generator] Generating captions with request:', request);

    this.aiService.generateCaptions(request).subscribe({
      next: (response) => {
        console.log('[AI Content Generator] Captions generated successfully:', response);
        this.aiCaptions.set(response);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('[AI Content Generator] Error generating captions:', error);
        console.error('[AI Content Generator] Error details:', {
          message: error?.message,
          error: error?.error,
          status: error?.status,
          statusText: error?.statusText,
          url: error?.url
        });
        const errorMsg = error?.error?.message || error?.message || 'Failed to generate captions. Please try again.';
        this.errorMessage.set(errorMsg);
        this.loading.set(false);
      }
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
      this.errorMessage.set('User not authenticated');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

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
      },
      error: (error) => {
        this.errorMessage.set('Failed to generate content plan. Please try again.');
        this.loading.set(false);
      }
    });
  }

  useContentPlanItem(item: any): void {
    const hashtagText = item.suggestedHashtags?.length > 0 ? '\n\n' + item.suggestedHashtags.join(' ') : '';
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
    this.aiService.getBestTimeToPost({
      tenantId: user.tenantId,
      userId: user.userId,
      lookbackDays: 30
    }).subscribe({
      next: (response) => {
        this.bestTimeToPost.set(response);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        // Don't show error for best time, it's optional
      }
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
      this.errorMessage.set('User not authenticated');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

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
        if (response.imageUrl) {
          this.postForm.patchValue({ mediaUrl: response.imageUrl });
        }
        this.loading.set(false);
      },
      error: (error) => {
        this.errorMessage.set('Failed to generate image. Please try again.');
        this.loading.set(false);
      }
    });
  }

  useGeneratedImage(): void {
    this.showPostCreator.set(true);
  }

  // Post Creation
  saveAsDraft(): void {
    if (this.postForm.invalid) {
      this.postForm.markAllAsTouched();
      return;
    }

    const user = this.authService.user();
    if (!user || !user.tenantId) {
      this.errorMessage.set('User not authenticated');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const formValue = this.postForm.value;
    const createRequest: CreatePostRequest = {
      clientId: user.tenantId, // For individual users, tenantId is used as clientId
      createdByTeamMemberId: user.userId,
      content: formValue.content,
      socialAccountIds: [], // Empty for draft
      scheduledAt: undefined
    };

    this.postsService.createPost(createRequest).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/dashboard/posts']);
      },
      error: (error) => {
        this.errorMessage.set('Failed to save draft. Please try again.');
        this.loading.set(false);
      }
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
    
    this.router.navigate(['/dashboard/post-editor'], { queryParams });
    this.showPostCreator.set(false);
  }

  resetForms(): void {
    this.captionForm.reset({
      captionCount: 3,
      includeHashtags: true,
      hashtagCount: 10
    });
    this.contentPlanForm.reset({
      postsPerWeek: 5,
      weeks: 4
    });
    this.imageForm.reset({
      aspectRatio: '1:1',
      width: 1024,
      height: 1024
    });
    this.postForm.reset();
    this.aiCaptions.set(null);
    this.contentPlan.set(null);
    this.generatedImage.set(null);
    this.selectedCaption.set(null);
    this.showPostCreator.set(false);
  }
}

