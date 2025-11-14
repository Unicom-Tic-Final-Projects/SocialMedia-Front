export type Platform = 'facebook' | 'instagram' | 'twitter' | 'linkedin' | 'youtube';

export interface SocialAccount {
  id: string;
  platform: Platform;
  accountName: string;
  accountId: string;
  accountType: 'business' | 'personal' | 'creator';
  connectedAt: string;
  status: 'connected' | 'disconnected' | 'reconnecting' | 'error';
  accessToken?: string;
  refreshToken?: string;
}

export interface PlatformAspect {
  platform: Platform;
  width: number;
  height: number;
  label: string;
  description?: string;
}

export interface PlatformPreviewConfig extends PlatformAspect {
  safeAreaPadding?: number;
  backgroundColor?: string;
}

export interface PostDraft {
  id: string;
  caption: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  selectedPlatforms: Platform[];
  createdAt: string;
  updatedAt: string;
}

export interface CropAdjustment {
  zoom: number;
  offsetX: number;
  offsetY: number;
}

export interface AnalyticsSummary {
  totalPosts: number;
  totalEngagement: number;
  followerGrowth: number;
  conversionRate: number;
}

export interface EngagementMetric {
  title: string;
  impressions: number;
  clicks: number;
  engagementRate: number;
}

export interface PlatformPerformance {
  platform: string;
  scheduled: number;
  published: number;
  drafts: number;
}

export interface SocialPost {
  id: number;
  title: string;
  body: string;
  tags: string[];
  reactions: number;
  views: number;
  status?: 'draft' | 'scheduled' | 'published' | 'pending';
  scheduledAt?: string;
}

export interface ApprovalRequest {
  id: number;
  postId: number;
  reviewer: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  notes?: string;
}

export interface NotificationItem {
  id: number;
  source: string;
  message: string;
  type: 'comment' | 'mention' | 'system' | 'alert';
  createdAt: string;
  read: boolean;
}

export interface UserProfile {
  id: number;
  fullName: string;
  email: string;
  avatarUrl?: string;
  role?: string;
  location?: string;
  bio?: string;
}

export interface AccountSettings {
  timezone: string;
  language: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
}

