import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, throwError, timer, of } from 'rxjs';
import { switchMap, tap, catchError, map } from 'rxjs/operators';
import { PostsService } from '../client/posts.service';
import { MediaService } from '../client/media.service';
import { ClientsService } from '../client/clients.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { PostDraftService } from '../client/post-draft.service';
import { PlatformSelectionService } from './platform-selection.service';
import { PostMediaService } from './post-media.service';
import { MediaUploadService } from './media-upload.service';
import {
  CreatePostRequest,
  UpdatePostRequest,
  SocialPost,
} from '../../models/post.models';
import { Platform, SocialAccount } from '../../models/social.models';
import { Client } from '../../models/client.models';

export interface PublishOptions {
  content: string;
  isEditMode: boolean;
  postId?: string;
  accountIds: string[];
  platformCropConfigs?: Record<
    Platform,
    {
      crop: { zoom: number; offsetX: number; offsetY: number };
      cropBox: { width: number; height: number; left: number; top: number };
    }
  >;
  platformCroppedImages?: Record<Platform, string>;
  isVideo?: boolean;
  mediaType?: 'image' | 'video';
  onGenerateCrop?: (platform: Platform) => Promise<string | null>;
}

export interface ScheduleOptions extends PublishOptions {
  scheduledAt: string;
}

/**
 * Service for handling post publishing and scheduling logic
 */
@Injectable({
  providedIn: 'root',
})
export class PostPublishService {
  private readonly postsService = inject(PostsService);
  private readonly mediaService = inject(MediaService);
  private readonly clientsService = inject(ClientsService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly draftService = inject(PostDraftService);
  private readonly platformSelectionService = inject(PlatformSelectionService);
  private readonly postMediaService = inject(PostMediaService);
  private readonly mediaUploadService = inject(MediaUploadService);

  /**
   * Ensure active client is available (for agencies)
   */
  ensureActiveClient(): Observable<Client | null> {
    const user = this.authService.user();
    if (!user || !user.tenantId) {
      return throwError(() => new Error('User not authenticated'));
    }

    const isAgency = this.authService.isAgency();
    if (!isAgency) {
      // Individual users: backend will automatically handle client
      const placeholderClient: Client = {
        id: user.tenantId,
        name: 'My Account',
        tenantId: user.tenantId,
        status: 'Active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return of(placeholderClient);
    }

    // Agencies must select a client
    const clients = this.clientsService.clients();
    if (!Array.isArray(clients) || clients.length === 0) {
      // Try to load clients first
      return this.clientsService.loadClients().pipe(
        map(() => {
          const activeClient = this.clientsService.getSelectedClient();
          if (!activeClient) {
            throw new Error('Client selection is required for agencies');
          }
          return activeClient;
        }),
      );
    }

    const activeClient = this.clientsService.getSelectedClient();
    if (!activeClient) {
      return throwError(() => new Error('Client selection is required for agencies'));
    }

    return of(activeClient);
  }

  /**
   * Prepare media for publishing (upload if needed, handle crops)
   */
  prepareMediaForPublish(
    uploadedMediaId: string | null,
    selectedFile: File | null,
    options: PublishOptions,
  ): Observable<string> {
    // If media already uploaded, use it
    if (uploadedMediaId) {
      return of(uploadedMediaId);
    }

    // If file selected but not uploaded, upload it
    if (selectedFile) {
      return this.mediaUploadService.uploadFile(selectedFile).pipe(
        map((response) => {
          this.postMediaService.setUploadedMediaId(response.mediaId);
          return response.mediaId;
        }),
      );
    }

    // No media
    return of('');
  }

  /**
   * Upload cropped image for a platform
   */
  uploadCroppedImage(
    croppedImageBase64: string,
    platform: Platform,
  ): Observable<{ mediaId: string }> {
    const file = this.base64ToFile(croppedImageBase64, `cropped-${platform}.png`);
    return this.mediaService.uploadMedia(file).pipe(
      map((response) => ({
        mediaId: response.id,
      })),
    );
  }

  /**
   * Create or update post with media
   */
  createOrUpdatePost(
    options: PublishOptions,
    activeClient: Client,
    mediaId: string,
  ): Observable<SocialPost> {
    const user = this.authService.user();
    if (!user || !user.tenantId) {
      return throwError(() => new Error('User not authenticated'));
    }

    if (options.isEditMode && options.postId) {
      const updateRequest: UpdatePostRequest = {
        content: options.content,
        mediaId: mediaId || undefined,
        socialAccountIds: options.accountIds,
        scheduledAt: undefined,
        platformCropConfigs:
          options.platformCropConfigs &&
          Object.keys(options.platformCropConfigs).length > 0
            ? options.platformCropConfigs
            : undefined,
      };
      return this.postsService.updatePost(options.postId, updateRequest);
    } else {
      const createRequest: CreatePostRequest = {
        clientId: activeClient.id,
        createdByTeamMemberId: user.userId,
        content: options.content,
        mediaId: mediaId || undefined,
        socialAccountIds: options.accountIds,
        scheduledAt: undefined,
        platformCropConfigs:
          options.platformCropConfigs &&
          Object.keys(options.platformCropConfigs).length > 0
            ? options.platformCropConfigs
            : undefined,
      };
      return this.postsService.createPost(createRequest);
    }
  }

  /**
   * Publish post immediately
   */
  publishPost(
    uploadedMediaId: string | null,
    selectedFile: File | null,
    options: PublishOptions,
  ): Observable<SocialPost> {
    return this.ensureActiveClient().pipe(
      switchMap((activeClient) => {
        if (!activeClient) {
          return throwError(() => new Error('Client is required'));
        }

        // Prepare media
        return this.prepareMediaForPublish(uploadedMediaId, selectedFile, options).pipe(
          switchMap((mediaId) => {
            // Get platform crop configs and cropped images
            const draft = this.draftService.getActiveDraft();
            const platformCropConfigs =
              options.platformCropConfigs || draft?.platformCropConfigs;
            const platformCroppedImages =
              options.platformCroppedImages || draft?.platformCroppedImages;
            const selectedPlatforms = draft?.selectedPlatforms || [];

            // For videos, use original media
            if (options.isVideo || options.mediaType === 'video') {
              return this.createOrUpdatePost(
                {
                  ...options,
                  platformCropConfigs: undefined, // No crop configs for videos
                },
                activeClient,
                mediaId,
              );
            }

            // For images, handle cropped images
            if (selectedPlatforms.length > 0) {
              const firstPlatform = selectedPlatforms[0];
              const croppedImageBase64 = platformCroppedImages?.[firstPlatform];

              if (!croppedImageBase64) {
                // Try to generate crop if callback provided
                if (options.onGenerateCrop) {
                  return new Observable<SocialPost>((observer) => {
                    options
                      .onGenerateCrop!(firstPlatform)
                      .then((cropped) => {
                        if (cropped) {
                          // Upload cropped image
                          this.uploadCroppedImage(cropped, firstPlatform)
                            .pipe(
                              switchMap((response) => {
                                return this.createOrUpdatePost(
                                  {
                                    ...options,
                                    platformCropConfigs,
                                  },
                                  activeClient,
                                  response.mediaId,
                                );
                              }),
                            )
                            .subscribe(observer);
                        } else {
                          observer.error(new Error('Failed to generate cropped image'));
                        }
                      })
                      .catch((err) => observer.error(err));
                  });
                } else {
                  return throwError(
                    () =>
                      new Error(
                        'Cropped images not found. Please go back to Step 3 and complete cropping before publishing.',
                      ),
                  );
                }
              }

              // Upload cropped image
              return this.uploadCroppedImage(croppedImageBase64, firstPlatform).pipe(
                switchMap((response) => {
                  return this.createOrUpdatePost(
                    {
                      ...options,
                      platformCropConfigs,
                    },
                    activeClient,
                    response.mediaId,
                  );
                }),
              );
            }

            // No platforms selected - use original media
            return this.createOrUpdatePost(options, activeClient, mediaId);
          }),
          // After post is created/updated, publish to social media
          switchMap((post) => {
            if (!post?.id) {
              return throwError(() => new Error('Post ID is missing. Cannot publish post.'));
            }

            // Wait a moment for DB commit
            return timer(500).pipe(
              switchMap(() => {
                return this.postsService.publishPost(post.id).pipe(
                  tap((response) => {
                    if (response?.message) {
                      (post as any).publishMessage = response.message;
                    }
                  }),
                  map((response) => {
                    (post as any).publishMessage = response.message;
                    return post;
                  }),
                );
              }),
            );
          }),
        );
      }),
    );
  }

  /**
   * Schedule post
   */
  schedulePost(
    uploadedMediaId: string | null,
    options: ScheduleOptions,
  ): Observable<SocialPost> {
    return this.ensureActiveClient().pipe(
      switchMap((activeClient) => {
        if (!activeClient) {
          return throwError(() => new Error('Client is required'));
        }

        // Create post first
        const mediaId = uploadedMediaId || undefined;
        return this.createOrUpdatePost(
          {
            ...options,
            platformCropConfigs:
              options.platformCropConfigs &&
              Object.keys(options.platformCropConfigs).length > 0
                ? options.platformCropConfigs
                : undefined,
          },
          activeClient,
          mediaId || '',
        ).pipe(
          switchMap((post) => {
            // Schedule the post
            const scheduleRequest = {
              postId: post.id,
              scheduledAt: options.scheduledAt,
              socialAccountIds: options.accountIds,
            };

            return this.postsService.schedulePost(post.id, scheduleRequest).pipe(
              map(() => post),
            );
          }),
        );
      }),
    );
  }

  /**
   * Format error message for user-friendly display
   */
  formatErrorMessage(error: any): string {
    let errorMsg =
      error?.userMessage ||
      error?.error?.message ||
      error?.message ||
      'An error occurred';

    // Add helpful context for specific errors
    if (
      errorMsg.includes('No Facebook pages available') ||
      errorMsg.includes('Facebook pages')
    ) {
      errorMsg = `${errorMsg}\n\nTip: Make sure you have a Facebook Page (not just a personal profile) and granted 'pages_show_list' and 'pages_manage_posts' permissions when connecting.`;
    } else if (errorMsg.includes('Token expired') || errorMsg.includes('Unauthorized')) {
      errorMsg = `${errorMsg}\n\nTip: Your social media account connection may have expired. Try reconnecting in Settings → Social Accounts.`;
    }

    return errorMsg;
  }

  /**
   * Format schedule error message
   */
  formatScheduleErrorMessage(error: any): string {
    let errorMsg =
      error?.userMessage ||
      error?.error?.message ||
      error?.message ||
      'Failed to schedule post';

    // Instagram Business Account errors
    if (
      errorMsg.includes('Instagram Business Account') ||
      errorMsg.includes('Failed to get Instagram Business Account')
    ) {
      if (
        errorMsg.includes('Unauthorized') ||
        errorMsg.includes('401') ||
        errorMsg.includes('400')
      ) {
        errorMsg =
          'Instagram publishing requires Facebook connection: Instagram Business accounts must be accessed through Facebook Graph API. To post to Instagram: 1) Connect Facebook (with a Facebook Page), 2) Make sure your Instagram Business account is linked to that Facebook Page in Instagram app, 3) Select only Facebook when posting (Instagram will be published automatically if linked). Do NOT connect Instagram separately - it will not work for Business accounts.';
      } else if (errorMsg.includes('not found')) {
        errorMsg =
          'Instagram Business Account not linked: Your Instagram account is not linked to a Facebook Page. Please: 1) Go to Instagram app → Settings → Account → Linked Accounts, 2) Link your Instagram to a Facebook Page, 3) Then connect Facebook (with Page) in Settings → Social Accounts.';
      } else {
        errorMsg =
          'Instagram Business Account setup issue: Your Instagram account must be a Business account (not Creator) and properly linked to a Facebook Page. Please check: 1) Instagram account type in Instagram app, 2) Facebook Page connection, 3) Connect Facebook (not Instagram) in Settings → Social Accounts.';
      }
    }

    // Facebook Pages error
    if (
      errorMsg.includes('No Facebook pages available') ||
      errorMsg.includes('Facebook pages')
    ) {
      errorMsg =
        "Facebook Page required: You need to connect a Facebook Page (not just a personal profile) to post. Facebook no longer allows posting to personal profiles via API. Please: 1) Create a Facebook Page if you don't have one, 2) Go to Settings → Social Accounts, 3) Connect Facebook and select your Page. Note: If your Instagram is linked to this Page, you can post to both Facebook and Instagram by selecting only Facebook.";
    }

    // Token expiration error
    if (
      errorMsg.includes('Token expired') ||
      (errorMsg.includes('Unauthorized') && !errorMsg.includes('Instagram'))
    ) {
      errorMsg =
        'Your social media account connection has expired. Please reconnect your account in Settings to continue scheduling.';
    }

    return errorMsg;
  }

  /**
   * Handle publish success
   */
  handlePublishSuccess(post: SocialPost, navigateTo: string = '/dashboard/posts'): void {
    const publishMessage = (post as any)?.publishMessage;
    if (publishMessage && publishMessage.includes('out of')) {
      if (publishMessage.includes('Failed to publish to')) {
        this.toastService.warning('Partial Publishing Success', publishMessage);
      } else {
        this.toastService.success('Post Published', publishMessage);
      }
    } else {
      this.toastService.success('Post published successfully!');
    }
    this.router.navigate([navigateTo]);
  }

  /**
   * Handle publish error
   */
  handlePublishError(error: any): void {
    const errorMsg = this.formatErrorMessage(error);
    this.toastService.error(errorMsg);
  }

  /**
   * Handle schedule success
   */
  handleScheduleSuccess(navigateTo: string = '/dashboard/posts'): void {
    this.toastService.success('Post scheduled successfully!');
    this.router.navigate([navigateTo]);
  }

  /**
   * Handle schedule error
   */
  handleScheduleError(error: any): void {
    const errorMsg = this.formatScheduleErrorMessage(error);
    this.toastService.error(errorMsg);
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
}

