import { Injectable, signal, computed } from '@angular/core';
import { PostDraft, Platform } from '../../models/social.models';

/**
 * Service for managing the active post draft throughout the multi-step wizard.
 * Only one active draft exists at a time.
 */
@Injectable({
  providedIn: 'root'
})
export class PostDraftService {
  private readonly activeDraftSignal = signal<PostDraft | null>(null);
  
  /**
   * Readonly signal for the active draft
   */
  readonly activeDraft = this.activeDraftSignal.asReadonly();
  
  /**
   * Computed signal indicating if there's an active draft
   */
  readonly hasActiveDraft = computed(() => this.activeDraftSignal() !== null);

  /**
   * Get the active draft (returns null if none exists)
   */
  getActiveDraft(): PostDraft | null {
    return this.activeDraftSignal();
  }

  /**
   * Create a new active draft (replaces any existing active draft)
   */
  createDraft(initialData?: Partial<Omit<PostDraft, 'id' | 'createdAt' | 'updatedAt'>>): PostDraft {
    const now = new Date().toISOString();
    const newDraft: PostDraft = {
      id: this.generateId('draft'),
      caption: initialData?.caption || '',
      platformCaptions: initialData?.platformCaptions,
      mediaUrl: initialData?.mediaUrl,
      mediaType: initialData?.mediaType,
      selectedPlatforms: initialData?.selectedPlatforms || [],
      platformCropConfigs: initialData?.platformCropConfigs,
      createdAt: now,
      updatedAt: now,
    };
    
    this.activeDraftSignal.set(newDraft);
    return newDraft;
  }

  /**
   * Update the active draft with partial changes
   */
  updateDraft(changes: Partial<Omit<PostDraft, 'id' | 'createdAt'>>): void {
    const current = this.activeDraftSignal();
    if (!current) {
      // If no active draft exists, create one with the changes
      this.createDraft(changes);
      return;
    }

    const updated: PostDraft = {
      ...current,
      ...changes,
      updatedAt: new Date().toISOString(),
    };
    
    this.activeDraftSignal.set(updated);
  }

  /**
   * Update the global caption
   */
  updateCaption(caption: string): void {
    this.updateDraft({ caption });
  }

  /**
   * Update platform-specific caption
   */
  updatePlatformCaption(platform: Platform, caption: string): void {
    const current = this.activeDraftSignal();
    if (!current) return;

    const platformCaptions: Partial<Record<Platform, string>> = { ...(current.platformCaptions || {}) };
    platformCaptions[platform] = caption;

    this.updateDraft({ platformCaptions: platformCaptions as Record<Platform, string> | undefined });
  }

  /**
   * Update selected platforms
   */
  updateSelectedPlatforms(platforms: Platform[]): void {
    this.updateDraft({ selectedPlatforms: platforms });
  }

  /**
   * Update media URL and type
   */
  updateMedia(mediaUrl: string, mediaType: 'image' | 'video'): void {
    this.updateDraft({ mediaUrl, mediaType });
  }

  /**
   * Update crop configuration for a platform
   */
  updatePlatformCrop(platform: Platform, cropConfig: {
    crop: { zoom: number; offsetX: number; offsetY: number };
    cropBox: { width: number; height: number; left: number; top: number };
  }): void {
    const current = this.activeDraftSignal();
    if (!current) return;

    const platformCropConfigs: Partial<Record<Platform, {
      crop: { zoom: number; offsetX: number; offsetY: number };
      cropBox: { width: number; height: number; left: number; top: number };
    }>> = { ...(current.platformCropConfigs || {}) };
    platformCropConfigs[platform] = cropConfig;

    this.updateDraft({ platformCropConfigs: platformCropConfigs as Record<Platform, {
      crop: { zoom: number; offsetX: number; offsetY: number };
      cropBox: { width: number; height: number; left: number; top: number };
    }> | undefined });
  }

  /**
   * Get caption for a specific platform (returns platform-specific if exists, otherwise global)
   */
  getPlatformCaption(platform: Platform): string {
    const draft = this.activeDraftSignal();
    if (!draft) return '';
    
    return draft.platformCaptions?.[platform] || draft.caption || '';
  }

  /**
   * Clear the active draft
   */
  clearDraft(): void {
    this.activeDraftSignal.set(null);
  }

  /**
   * Generate a unique ID
   */
  private generateId(prefix: string): string {
    return `${prefix}_${Math.random().toString(36).slice(2, 9)}_${Date.now()}`;
  }
}

