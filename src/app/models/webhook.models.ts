export interface WebhookSubscription {
  id: string;
  tenantId: string;
  socialAccountId?: string;
  platform: string;
  subscriptionId: string;
  callbackUrl: string;
  webhookToken?: string;
  eventTypes?: string;
  isActive: boolean;
  isVerified: boolean;
  subscribedAt?: string;
  expiresAt?: string;
  totalEventsReceived: number;
  successfulEvents: number;
  failedEvents: number;
  lastEventReceivedAt?: string;
}

export interface CreateWebhookSubscriptionRequest {
  tenantId: string;
  socialAccountId?: string;
  platform: string;
  callbackUrl: string;
  eventTypes?: string;
  configuration?: {
    defaultUserId?: string;
    defaultClientId?: string;
    defaultSocialAccountIds?: string[];
  };
}

export interface WebhookEvent {
  id: string;
  tenantId: string;
  platform: string;
  eventType: string;
  status: string;
  relatedPostId?: string;
  relatedSocialAccountId?: string;
  receivedAt: string;
  processedAt?: string;
  retryCount: number;
  errorMessage?: string;
}

export interface ContentWebhookRequest {
  token: string;
  source: string;
  content: string;
  title?: string;
  mediaUrl?: string;
  mediaType?: string;
  sourceUrl?: string;
  scheduledAt?: string;
  socialAccountIds?: string[];
  clientId?: string;
  metadata?: Record<string, any>;
}

