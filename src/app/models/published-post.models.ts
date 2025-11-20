// Published Post models for social media posts

export interface PublishedPostResponse {
  id: string;
  clientId: string;
  content: string;
  status: string;
  scheduledAt?: string;
  createdAt: string;
  updatedAt?: string;
  media?: MediaAssetResponse;
  socialMediaDetails: SocialMediaPublishDetail[];
}

export interface SocialMediaPublishDetail {
  publishLogId: string;
  platform: string;
  socialAccountId: string;
  status: 'Success' | 'Failed' | 'Pending';
  errorMessage?: string;
  platformPostId?: string;
  platformUrl?: string;
  attemptedAt: string;
  retryAttempt: number;
  responseData?: Record<string, any>;
}

export interface MediaAssetResponse {
  mediaId: string;
  tenantId: string;
  uploadedByUserId: string;
  url: string;
  fileType: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
}

