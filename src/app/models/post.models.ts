// Post models matching backend DTOs

export interface PostResponse {
  id: string; // GUID as string
  clientId: string; // GUID as string
  createdByTeamMemberId: string; // GUID as string
  mediaId?: string; // GUID as string
  content: string;
  status: PostStatus;
  scheduledAt?: string; // ISO date string
  createdAt: string; // ISO date string
  updatedAt?: string; // ISO date string
  
  // Related data
  media?: MediaAssetResponse;
  postTargets: PostTargetResponse[];
  postVersions: PostVersionResponse[];
  approvalRequests: ApprovalRequestResponse[];
  publishLogs: PublishLogResponse[];
}

export type PostStatus = 
  | 'Draft' 
  | 'PendingApproval' 
  | 'Approved' 
  | 'Scheduled' 
  | 'Published';

export interface CreatePostRequest {
  clientId: string; // GUID as string
  createdByTeamMemberId: string; // GUID as string
  content: string;
  mediaId?: string; // GUID as string
  socialAccountIds: string[]; // GUIDs as strings
  scheduledAt?: string; // ISO date string
  platformCropConfigs?: Record<string, {
    crop: { zoom: number; offsetX: number; offsetY: number };
    cropBox: { width: number; height: number; left: number; top: number };
  }>;
}

export interface UpdatePostRequest {
  content: string;
  mediaId?: string; // GUID as string
  socialAccountIds: string[]; // GUIDs as strings
  scheduledAt?: string; // ISO date string
  platformCropConfigs?: Record<string, {
    crop: { zoom: number; offsetX: number; offsetY: number };
    cropBox: { width: number; height: number; left: number; top: number };
  }>;
}

export interface SchedulePostRequest {
  postId: string; // GUID as string
  scheduledAt: string; // ISO date string
  socialAccountIds: string[]; // GUIDs as strings
}

export interface PostTargetResponse {
  id: string; // GUID as string
  postId: string; // GUID as string
  socialAccountId: string; // GUID as string
  platform: string;
}

export interface MediaAssetResponse {
  id: string; // GUID as string
  mediaId: string; // GUID as string
  tenantId: string; // GUID as string
  uploadedByUserId: string; // GUID as string
  url: string;
  fileType: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string; // ISO date string
}

export interface PostVersionResponse {
  id: string; // GUID as string
  postId: string; // GUID as string
  content: string;
  versionNumber: number;
  createdAt: string; // ISO date string
}

export interface ApprovalRequestResponse {
  id: string; // GUID as string
  postId: string; // GUID as string
  requestedById: string; // GUID as string
  reviewedById?: string; // GUID as string
  status: 'Pending' | 'Approved' | 'Rejected';
  comment?: string;
  createdAt: string; // ISO date string
  reviewedAt?: string; // ISO date string
}

export interface PublishLogResponse {
  id: string; // GUID as string
  postId: string; // GUID as string
  socialAccountId: string; // GUID as string
  platform: string;
  status: 'Success' | 'Failed';
  publishedAt: string; // ISO date string
  errorMessage?: string;
}

// Frontend-friendly Post model (mapped from PostResponse)
export interface SocialPost {
  id: string; // GUID as string
  clientId: string;
  content: string;
  status: PostStatus;
  scheduledAt?: string;
  createdAt: string;
  updatedAt?: string;
  
  // UI-friendly fields
  title?: string; // Extracted from content or generated
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  platforms: string[]; // From postTargets
  reactions?: number; // From analytics (future)
  views?: number; // From analytics (future)
}

