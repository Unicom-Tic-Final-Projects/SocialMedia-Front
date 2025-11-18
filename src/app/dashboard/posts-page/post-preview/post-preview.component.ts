/**
 * Post Preview Component
 * 
 * This component provides a preview interface for social media posts.
 * Supports two modes:
 * 1. Modal view (for Posts Page) - uses open, mediaUrl, caption, selectedPlatforms inputs
 * 2. Draft-based preview (for Post Editor Step 4) - uses draft input
 */

import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  signal,
  computed,
  inject,
} from '@angular/core';
import { CommonModule, NgStyle } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Platform, CropAdjustment, SocialAccount, PostDraft } from '../../../models/social.models';
import { PlatformPreviewService } from '../../../services/client/platform-preview.service';
import { SocialAccountsService } from '../../../services/client/social-accounts.service';

interface PlatformMeta {
  icon: string;
  label: string;
  color: string;
}

interface PlatformCropState {
  platform: Platform;
  crop: CropAdjustment;
  cropBox: {
    width: number;
    height: number;
    left: number;
    top: number;
  };
  isConnected: boolean;
  account?: SocialAccount;
}

@Component({
  selector: 'app-post-preview',
  standalone: true,
  imports: [CommonModule, FormsModule, NgStyle],
  templateUrl: './post-preview.component.html',
  styleUrl: './post-preview.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostPreviewComponent implements OnChanges {
  // Modal mode inputs (for Posts Page)
  @Input() mediaUrl: string | null = null;
  @Input() caption: string = '';
  @Input() selectedPlatforms: Platform[] = [];
  @Input() cropEnabled: boolean = true;
  @Input() open: boolean = false;

  // Draft mode input (for Post Editor Step 4)
  @Input() draft: PostDraft | null = null;

  @Output() onClose = new EventEmitter<void>();
  @Output() onCrop = new EventEmitter<string>();
  @Output() previewLoaded = new EventEmitter<void>();

  // Computed properties for draft mode
  readonly isDraftMode = computed(() => !!this.draft);
  readonly draftMediaUrl = computed(() => this.draft?.mediaUrl || null);
  readonly draftSelectedPlatforms = computed(() => this.draft?.selectedPlatforms || []);

  readonly allPlatforms: Platform[] = ['facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'tiktok', 'pinterest'];

  readonly platformMeta: Record<Platform, PlatformMeta> = {
    facebook: { icon: 'fa-brands fa-facebook-f', label: 'Facebook', color: '#1877F2' },
    instagram: { icon: 'fa-brands fa-instagram', label: 'Instagram', color: '#E1306C' },
    twitter: { icon: 'fa-brands fa-x-twitter', label: 'X (Twitter)', color: '#1DA1F2' },
    linkedin: { icon: 'fa-brands fa-linkedin-in', label: 'LinkedIn', color: '#0A66C2' },
    youtube: { icon: 'fa-brands fa-youtube', label: 'YouTube', color: '#FF0000' },
    tiktok: { icon: 'fa-brands fa-tiktok', label: 'TikTok', color: '#000000' },
    pinterest: { icon: 'fa-brands fa-pinterest', label: 'Pinterest', color: '#E60023' },
  };

  /**
   * Generate realistic engagement numbers for preview
   */
  getEngagementNumbers(platform: Platform): { likes: number; comments: number; shares: number } {
    const base = Math.floor(Math.random() * 1000) + 100;
    const multipliers: Record<Platform, { likes: number; comments: number; shares: number }> = {
      facebook: { likes: base * 1.2, comments: Math.floor(base * 0.15), shares: Math.floor(base * 0.08) },
      instagram: { likes: base * 2.5, comments: Math.floor(base * 0.12), shares: 0 },
      linkedin: { likes: base * 0.8, comments: Math.floor(base * 0.1), shares: Math.floor(base * 0.05) },
      twitter: { likes: base * 0.6, comments: Math.floor(base * 0.08), shares: Math.floor(base * 0.1) },
      tiktok: { likes: base * 3.0, comments: Math.floor(base * 0.2), shares: Math.floor(base * 0.15) },
      youtube: { likes: base * 0.5, comments: Math.floor(base * 0.05), shares: 0 },
      pinterest: { likes: base * 1.5, comments: 0, shares: 0 },
    };
    return multipliers[platform];
  }

  /**
   * Format engagement numbers (e.g., 1200 -> "1.2K")
   */
  formatEngagement(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  selectedPlatform = signal<Platform | null>(null);
  platformCropStates = signal<Map<Platform, PlatformCropState>>(new Map());
  cropBox = signal({
    width: 280,
    height: 300,
    left: 40,
    top: 100,
  });

  isDraggingCropBox = signal(false);
  isResizingCrop = signal(false);
  activeHandle = signal<string | null>(null);
  dragStartX = signal(0);
  dragStartY = signal(0);
  initialLeft = signal(0);
  initialTop = signal(0);
  initialWidth = signal(0);
  initialHeight = signal(0);

  imageLoaded = signal(false);
  displayMaxWidth = 350;

  private readonly defaultCrop: CropAdjustment = { zoom: 1, offsetX: 0, offsetY: 0 };

  private readonly platformPreview = inject(PlatformPreviewService);
  private readonly socialAccountsService = inject(SocialAccountsService);

  readonly socialAccounts = this.socialAccountsService.accounts;

  readonly detectedMediaType = computed(() => {
    const url = this.isDraftMode() ? this.draftMediaUrl() : this.mediaUrl;
    if (!url) return null;
    const ext = url.split('.').pop()?.toLowerCase();
    if (['mp4', 'mov', 'webm', 'avi'].includes(ext || '')) {
      return 'video';
    }
    return 'image';
  });

  /**
   * Get caption for a platform (platform-specific if exists, otherwise global)
   */
  getPlatformCaption(platform: Platform): string {
    if (this.isDraftMode() && this.draft) {
      return this.draft.platformCaptions?.[platform] || this.draft.caption || '';
    }
    return this.caption;
  }

  /**
   * Get crop style for a platform (from draft if available)
   */
  getCropStyleFromDraft(platform: Platform): { [key: string]: string } {
    if (!this.isDraftMode() || !this.draft?.platformCropConfigs?.[platform]) {
      return this.imageStyle(platform);
    }

    const crop = this.draft.platformCropConfigs[platform].crop;
    return {
      transform: `translate(${crop.offsetX}%, ${crop.offsetY}%) scale(${crop.zoom})`,
      transformOrigin: 'center center',
      willChange: 'transform',
    };
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['draft']) {
      // Draft mode: initialize from draft
      const platforms = this.draftSelectedPlatforms();
      this.initializePlatformStates();
      if (platforms.length > 0 && !this.selectedPlatform()) {
        this.selectPlatform(platforms[0]);
      }
      // Preview loaded event will be emitted when media actually loads (via onMediaLoaded)
    } else if (changes['selectedPlatforms'] || changes['mediaUrl']) {
      // Modal mode: initialize from inputs
      this.initializePlatformStates();
      if (this.selectedPlatforms.length > 0 && !this.selectedPlatform()) {
        this.selectPlatform(this.selectedPlatforms[0]);
      }
    }
  }

  private initializePlatformStates(): void {
    const states = new Map<Platform, PlatformCropState>();
    const accounts = this.socialAccounts();
    const platforms = this.isDraftMode() 
      ? this.draftSelectedPlatforms() 
      : (this.selectedPlatforms.length > 0 ? this.selectedPlatforms : this.allPlatforms);

    platforms.forEach((platform) => {
      const account = accounts.find(
        (acc) => acc.platform === platform && acc.status === 'connected'
      );
      const isConnected = !!account;

      const aspect = this.platformPreview.getAspect(platform);
      const displayDims = this.getDisplayDimensions(platform);
      const cropBoxWidth = Math.min(displayDims.width * 0.8, 280);
      const cropBoxHeight = Math.min(displayDims.height * 0.8, 300);

      states.set(platform, {
        platform,
        crop: { ...this.defaultCrop },
        cropBox: {
          width: cropBoxWidth,
          height: cropBoxHeight,
          left: (displayDims.width - cropBoxWidth) / 2,
          top: (displayDims.height - cropBoxHeight) / 2,
        },
        isConnected,
        account: isConnected ? account : undefined,
      });
    });

    this.platformCropStates.set(states);
  }

  selectPlatform(platform: Platform): void {
    this.selectedPlatform.set(platform);
    const state = this.platformCropStates().get(platform);
    if (state) {
      this.cropBox.set({ ...state.cropBox });
    }
    this.imageLoaded.set(false);
  }

  getCropState(platform: Platform): PlatformCropState | undefined {
    return this.platformCropStates().get(platform);
  }

  getDisplayDimensions(platform: Platform): { width: number; height: number } {
    const clamped = Math.min(Math.max(this.displayMaxWidth, 200), 800);
    return this.platformPreview.getDisplaySize(platform, clamped);
  }

  getPlatformAspect(platform: Platform) {
    return this.platformPreview.getAspect(platform);
  }

  getCrop(platform: Platform): CropAdjustment {
    const state = this.getCropState(platform);
    return state?.crop ?? { ...this.defaultCrop };
  }

  setZoom(platform: Platform, value: number): void {
    const states = this.platformCropStates();
    const state = states.get(platform);
    if (state) {
      const zoom = Math.min(Math.max(value, 1), 3);
      state.crop = { ...state.crop, zoom };
      states.set(platform, { ...state });
      this.platformCropStates.set(new Map(states));
      this.emitCropChange();
    }
  }

  setOffset(platform: Platform, axis: 'offsetX' | 'offsetY', value: number): void {
    const states = this.platformCropStates();
    const state = states.get(platform);
    if (state) {
      const v = Math.min(Math.max(value, -100), 100);
      state.crop = { ...state.crop, [axis]: v };
      states.set(platform, { ...state });
      this.platformCropStates.set(new Map(states));
      this.emitCropChange();
    }
  }

  imageStyle(platform: Platform): { [key: string]: string } {
    const crop = this.getCrop(platform);
    return {
      transform: `translate(${crop.offsetX}%, ${crop.offsetY}%) scale(${crop.zoom})`,
      transformOrigin: 'center center',
      willChange: 'transform',
    };
  }

  onImageLoad(): void {
    this.imageLoaded.set(true);
  }

  /**
   * Called when media (image or video) is loaded in draft mode
   */
  onMediaLoaded(): void {
    if (this.isDraftMode()) {
      this.previewLoaded.emit();
    }
  }

  startDragCropBox(event: MouseEvent | TouchEvent): void {
    if (!this.cropEnabled || this.isResizingCrop()) return;
    this.isDraggingCropBox.set(true);
    this.dragStartX.set('touches' in event ? event.touches[0].clientX : event.clientX);
    this.dragStartY.set('touches' in event ? event.touches[0].clientY : event.clientY);
    const box = this.cropBox();
    this.initialLeft.set(box.left);
    this.initialTop.set(box.top);
  }

  moveCropBox(event: MouseEvent | TouchEvent): void {
    if (!this.isDraggingCropBox()) return;
    const moveX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const moveY = 'touches' in event ? event.touches[0].clientY : event.clientY;

    const dx = moveX - this.dragStartX();
    const dy = moveY - this.dragStartY();

    const box = this.cropBox();
    this.cropBox.set({
      ...box,
      left: this.initialLeft() + dx,
      top: this.initialTop() + dy,
    });
  }

  stopDragCropBox(): void {
    if (this.isDraggingCropBox()) {
      const platform = this.selectedPlatform();
      if (platform) {
        this.saveCropBoxToPlatform(platform);
      }
    }
    this.isDraggingCropBox.set(false);
  }

  startResize(event: MouseEvent, handle: string): void {
    if (!this.cropEnabled) return;
    event.preventDefault();
    event.stopPropagation();
    this.isResizingCrop.set(true);
    this.activeHandle.set(handle);
    this.dragStartX.set(event.clientX);
    this.dragStartY.set(event.clientY);
    const box = this.cropBox();
    this.initialWidth.set(box.width);
    this.initialHeight.set(box.height);
    this.initialLeft.set(box.left);
    this.initialTop.set(box.top);
  }

  moveResize(event: MouseEvent): void {
    if (!this.isResizingCrop() || !this.activeHandle()) return;
    const dx = event.clientX - this.dragStartX();
    const dy = event.clientY - this.dragStartY();
    const box = this.cropBox();

    let newBox = { ...box };

    switch (this.activeHandle()) {
      case 'r':
        newBox.width = Math.max(50, this.initialWidth() + dx);
        break;
      case 'l':
        const newWidth = Math.max(50, this.initialWidth() - dx);
        newBox.width = newWidth;
        newBox.left = this.initialLeft() + (this.initialWidth() - newWidth);
        break;
      case 'b':
        newBox.height = Math.max(50, this.initialHeight() + dy);
        break;
      case 't':
        const newHeight = Math.max(50, this.initialHeight() - dy);
        newBox.height = newHeight;
        newBox.top = this.initialTop() + (this.initialHeight() - newHeight);
        break;
      case 'br':
        newBox.width = Math.max(50, this.initialWidth() + dx);
        newBox.height = Math.max(50, this.initialHeight() + dy);
        break;
    }

    this.cropBox.set(newBox);
  }

  stopResize(): void {
    if (this.isResizingCrop()) {
      const platform = this.selectedPlatform();
      if (platform) {
        this.saveCropBoxToPlatform(platform);
      }
    }
    this.isResizingCrop.set(false);
    this.activeHandle.set(null);
  }

  private saveCropBoxToPlatform(platform: Platform): void {
    const states = this.platformCropStates();
    const state = states.get(platform);
    if (state) {
      state.cropBox = { ...this.cropBox() };
      states.set(platform, { ...state });
      this.platformCropStates.set(new Map(states));
      this.emitCropChange();
    }
  }

  private emitCropChange(): void {
    const platform = this.selectedPlatform();
    if (platform) {
      const state = this.getCropState(platform);
      if (state) {
        const cropData = JSON.stringify({
          platform,
          crop: state.crop,
          cropBox: state.cropBox,
        });
        this.onCrop.emit(cropData);
      }
    }
  }

  getPlatformIcon(platform: Platform): string {
    return this.platformMeta[platform]?.icon ?? 'fa-solid fa-link';
  }

  getPlatformName(platform: Platform): string {
    return this.platformMeta[platform]?.label ?? platform;
  }

  close(): void {
    this.open = false;
    this.onClose.emit();
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (this.isDraggingCropBox()) {
      this.moveCropBox(event);
    } else if (this.isResizingCrop()) {
      this.moveResize(event);
    }
  }

  @HostListener('document:mouseup')
  onMouseUp(): void {
    this.stopDragCropBox();
    this.stopResize();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open) {
      this.close();
    }
  }
}


