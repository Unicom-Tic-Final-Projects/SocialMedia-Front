import { Component, OnInit, inject, signal, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { CommonModule, KeyValuePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { PostsService } from '../../../services/client/posts.service';
import { MediaService } from '../../../services/client/media.service';
import { SocialAccountsService } from '../../../services/client/social-accounts.service';
import { AIService } from '../../../services/client/ai.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { CreatePostRequest } from '../../../models/post.models';
import { SocialAccount } from '../../../models/social.models';
import { AIAssistantComponent } from '../ai-assistant/ai-assistant';
import { MediaSelectorComponent } from './media-selector/media-selector';
import { FileUploadComponent, UploadedFile } from '../../../shared/file-upload/file-upload.component';

@Component({
  selector: 'app-post-creator',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink, KeyValuePipe, AIAssistantComponent, MediaSelectorComponent, FileUploadComponent],
  templateUrl: './post-creator.html',
  styleUrl: './post-creator.css'
})
export class PostCreatorComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInputRef?: ElementRef<HTMLInputElement>;
  
  private readonly fb = inject(FormBuilder);
  private readonly postsService = inject(PostsService);
  private readonly mediaService = inject(MediaService);
  private readonly socialAccountsService = inject(SocialAccountsService);
  private readonly aiService = inject(AIService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private routeSubscription?: Subscription;

  postForm: FormGroup;
  loading = signal(false);

  // Media
  selectedFile = signal<File | null>(null);
  mediaPreview = signal<string | null>(null);
  isVideo = signal(false);
  uploadedMediaId = signal<string | null>(null);
  uploading = signal(false);
  uploadProgress = signal(0);
  showMediaLibrary = signal(false);
  uploadedFiles = signal<UploadedFile[]>([]);

  // Social accounts
  socialAccounts = signal<SocialAccount[]>([]);
  selectedAccountIds = signal<string[]>([]);
  loadingAccounts = signal(false);

  // AI features
  showAIAssistant = signal(false);
  aiGeneratedContent = signal<string | null>(null);

  constructor() {
    this.postForm = this.fb.group({
      content: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(4000)]],
      scheduledAt: [null],
      saveAsDraft: [false]
    });
  }

  ngOnInit(): void {
    this.loadSocialAccounts();
    this.checkQueryParams();
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
  }

  private checkQueryParams(): void {
    this.routeSubscription = this.route.queryParams.subscribe(params => {
      // Handle pre-selected media from content library
      if (params['mediaId']) {
        this.loadMediaById(params['mediaId']);
      }
      
      // Handle pre-filled content
      if (params['content']) {
        this.postForm.patchValue({ content: decodeURIComponent(params['content']) });
      }
    });
  }

  private loadMediaById(mediaId: string): void {
    this.uploadedMediaId.set(mediaId);
    this.mediaService.getMedia(mediaId).subscribe({
      next: (media) => {
        this.mediaPreview.set(media.url);
        this.uploadedMediaId.set(media.id);
        this.selectedFile.set(null); // Clear any uploaded file
        // Detect if media is a video
        this.isVideo.set(media.fileType?.startsWith('video/') || false);
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error loading media:', error);
        this.toastService.error('Failed to load selected media');
      }
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
    this.mediaPreview.set(mediaUrl);
    this.selectedFile.set(null); // Clear any uploaded file
    this.showMediaLibrary.set(false);
    // Clear any previous errors
    // Detect if selected media is a video
    if (fileType) {
      this.isVideo.set(fileType.startsWith('video/'));
    } else {
      // Try to detect from URL extension as fallback
      const isVideoUrl = /\.(mp4|mov|avi|webm|mkv|flv|wmv)(\?|$)/i.test(mediaUrl);
      this.isVideo.set(isVideoUrl);
    }
  }

  triggerFileInput(): void {
    this.fileInputRef?.nativeElement?.click();
  }

  loadSocialAccounts(): void {
    this.loadingAccounts.set(true);
    this.socialAccountsService.getSocialAccounts().subscribe({
      next: (accounts) => {
        this.socialAccounts.set(accounts);
        this.loadingAccounts.set(false);
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error loading social accounts:', error);
        this.loadingAccounts.set(false);
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.handleFile(input.files[0]);
    }
  }

  handleFile(file: File): void {
    this.selectedFile.set(file);

    // Detect if file is a video
    const isVideoFile = file.type.startsWith('video/') || 
                       /\.(mp4|mov|avi|webm|mkv|flv|wmv)$/i.test(file.name);
    this.isVideo.set(isVideoFile);

    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = e.target?.result as string;
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
      
      // Auto-upload
      this.uploadMedia(file, fileId);
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
    this.toastService.error('Invalid file type. Please upload images (JPEG, PNG, GIF, WebP) or videos (MP4, MOV, AVI, WebM, etc.)');
  }

  onSizeLimitExceeded(files: File[]): void {
    const file = files[0];
    const isVideo = file.type.startsWith('video/');
    const sizeLimitMB = isVideo ? 100 : 10;
    this.toastService.error(`File size exceeds ${sizeLimitMB}MB limit`);
  }

  onFileDeleted(fileId: string): void {
    const files = this.uploadedFiles();
    const fileToDelete = files.find(f => f.id === fileId);
    if (fileToDelete) {
      this.uploadedFiles.set(files.filter(f => f.id !== fileId));
      this.selectedFile.set(null);
      this.mediaPreview.set(null);
      this.uploadedMediaId.set(null);
      this.isVideo.set(false);
    }
  }

  onFileRetry(fileId: string): void {
    const files = this.uploadedFiles();
    const fileToRetry = files.find(f => f.id === fileId);
    if (fileToRetry) {
      // Reset progress and retry upload
      const updatedFiles = files.map(f => 
        f.id === fileId ? { ...f, progress: 0, failed: false } : f
      );
      this.uploadedFiles.set(updatedFiles);
      this.uploadMedia(fileToRetry.file);
    }
  }

  uploadMedia(file: File, fileId?: string): void {
    // Validate file type first
    let isImage = file.type.startsWith('image/');
    let isVideo = file.type.startsWith('video/');
    
    if (!isImage && !isVideo) {
      // If file.type is empty or unknown, check file extension as fallback
      const fileName = file.name.toLowerCase();
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.flv', '.wmv'];
      
      const hasImageExt = imageExtensions.some(ext => fileName.endsWith(ext));
      const hasVideoExt = videoExtensions.some(ext => fileName.endsWith(ext));
      
      if (!hasImageExt && !hasVideoExt) {
        this.toastService.error('Invalid file type. Please upload images (JPEG, PNG, GIF, WebP) or videos (MP4, MOV, AVI, WebM, etc.)');
        return;
      }
      
      // Set flags based on extension if MIME type is missing
      isImage = hasImageExt;
      isVideo = hasVideoExt;
    }

    // Different size limits for images vs videos
    const maxImageSize = 10 * 1024 * 1024; // 10MB for images
    const maxVideoSize = 100 * 1024 * 1024; // 100MB for videos (matches backend limit)
    
    const maxSize = isVideo ? maxVideoSize : maxImageSize;
    if (file.size > maxSize) {
      const sizeLimitMB = isVideo ? 100 : 10;
      this.toastService.error(`File size exceeds ${sizeLimitMB}MB limit`);
      return;
    }

    this.uploading.set(true);
    this.uploadProgress.set(0);
    
    // Update file progress in uploadedFiles
    if (fileId) {
      const files = this.uploadedFiles();
      const updatedFiles = files.map(f => 
        f.id === fileId ? { ...f, progress: 0, failed: false } : f
      );
      this.uploadedFiles.set(updatedFiles);
    }
    
    console.log('Uploading media:', {
      name: file.name,
      type: file.type || 'unknown',
      size: file.size,
      sizeMB: (file.size / (1024 * 1024)).toFixed(2),
      isVideo: isVideo,
      isImage: isImage
    });
    
    this.mediaService.uploadMedia(file, (progress) => {
      this.uploadProgress.set(progress);
      // Update file progress in uploadedFiles
      if (fileId) {
        const files = this.uploadedFiles();
        const updatedFiles = files.map(f => 
          f.id === fileId ? { ...f, progress } : f
        );
        this.uploadedFiles.set(updatedFiles);
      }
    }).subscribe({
      next: (response) => {
        console.log('Media upload successful:', response);
        this.uploadedMediaId.set(response.id);
        this.uploading.set(false);
        this.uploadProgress.set(100);
        
        // Update file as complete
        if (fileId) {
          const files = this.uploadedFiles();
          const updatedFiles = files.map(f => 
            f.id === fileId ? { ...f, progress: 100, failed: false } : f
          );
          this.uploadedFiles.set(updatedFiles);
        }
        
        this.toastService.success('Media uploaded successfully!');
        // Reset progress after a short delay
        setTimeout(() => {
          this.uploadProgress.set(0);
        }, 1000);
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error uploading media:', error);
        console.error('Full error details:', {
          status: error.status,
          statusText: error.statusText,
          error: error.error,
          message: error.message
        });
        const errorMsg = error?.error?.message || error?.error?.Message || error?.message || 'Failed to upload media. Please try again.';
        this.toastService.error(errorMsg);
        this.uploading.set(false);
        this.uploadProgress.set(0);
        
        // Update file as failed
        if (fileId) {
          const files = this.uploadedFiles();
          const updatedFiles = files.map(f => 
            f.id === fileId ? { ...f, progress: 0, failed: true } : f
          );
          this.uploadedFiles.set(updatedFiles);
        } else {
          this.selectedFile.set(null);
          this.mediaPreview.set(null);
          this.isVideo.set(false);
        }
      }
    });
  }

  toggleAccountSelection(accountId: string): void {
    const current = this.selectedAccountIds();
    if (current.includes(accountId)) {
      this.selectedAccountIds.set(current.filter(id => id !== accountId));
    } else {
      this.selectedAccountIds.set([...current, accountId]);
    }
  }

  openAIAssistant(): void {
    this.showAIAssistant.set(true);
  }

  useAIContent(content: string): void {
    this.postForm.patchValue({ content });
    this.showAIAssistant.set(false);
  }

  saveAsDraft(): void {
    if (this.postForm.invalid) {
      this.postForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const formValue = this.postForm.value;

    // TODO: Implement draft saving
    // For now, navigate to post editor with draft flag
    this.router.navigate(['/dashboard/post-editor'], {
      queryParams: {
        draft: 'true',
        content: formValue.content,
        mediaId: this.uploadedMediaId() || undefined
      }
    });
  }

  createPost(): void {
    if (this.postForm.invalid || this.selectedAccountIds().length === 0) {
      this.postForm.markAllAsTouched();
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

    const request: CreatePostRequest = {
      clientId: user.tenantId!,
      createdByTeamMemberId: user.userId,
      content: formValue.content,
      mediaId: this.uploadedMediaId() || undefined,
      socialAccountIds: this.selectedAccountIds(),
      scheduledAt: formValue.scheduledAt ? new Date(formValue.scheduledAt).toISOString() : undefined
    };

    this.postsService.createPost(request).subscribe({
      next: () => {
        this.loading.set(false);
        this.toastService.success('Post created successfully!');
        this.router.navigate(['/dashboard/posts']);
      },
      error: (error: HttpErrorResponse) => {
        this.toastService.error(error?.error?.message || 'Failed to create post');
        this.loading.set(false);
      }
    });
  }

  getAccountsByPlatform(): Map<string, SocialAccount[]> {
    const grouped = new Map<string, SocialAccount[]>();
    this.socialAccounts().forEach(account => {
      const platform = account.platform;
      if (!grouped.has(platform)) {
        grouped.set(platform, []);
      }
      grouped.get(platform)!.push(account);
    });
    return grouped;
  }
}

