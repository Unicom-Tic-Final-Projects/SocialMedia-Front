import { ChangeDetectionStrategy, Component, EventEmitter, HostListener, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CropAdjustment, Platform } from '../../../models/social.models';
import { PlatformPreviewService } from '../../../services/client/platform-preview.service';

interface PlatformMeta {
  icon: string;
  label: string;
}

@Component({
  selector: 'app-post-preview-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './post-preview-modal.html',
  styleUrl: './post-preview-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostPreviewModal implements OnChanges {
  @Input() open = false;
  @Input() mediaUrl = '';
  @Input() caption = '';
  @Input() targets: Platform[] = [];

  @Output() close = new EventEmitter<void>();

  selectedPlatform: Platform | null = null;
  readonly platformAspects = new Map<
    Platform,
    { width: number; height: number; label: string; description?: string }
  >();

  // Adjustable preview size (default acts like previous behavior)
  displayMaxWidth = 350;

  // Simple crop state per platform (zoom and pan)
  private readonly defaultCrop: CropAdjustment = { zoom: 1, offsetX: 0, offsetY: 0 };
  private cropState: Record<Platform, CropAdjustment> = {} as Record<Platform, CropAdjustment>;
  imageLoaded = false;

  readonly platformMeta: Record<Platform, PlatformMeta> = {
    facebook: { icon: 'fa-brands fa-facebook-f', label: 'Facebook' },
    instagram: { icon: 'fa-brands fa-instagram', label: 'Instagram' },
    twitter: { icon: 'fa-brands fa-x-twitter', label: 'X (Twitter)' },
    linkedin: { icon: 'fa-brands fa-linkedin-in', label: 'LinkedIn' },
    youtube: { icon: 'fa-brands fa-youtube', label: 'YouTube' },
    tiktok: { icon: 'fa-brands fa-tiktok', label: 'TikTok' },
  };

  constructor(private readonly platformPreview: PlatformPreviewService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['targets'] || changes['mediaUrl']) {
      this.imageLoaded = false;
      this.syncPlatforms();
    }
  }

  selectPlatform(platform: Platform): void {
    this.selectedPlatform = platform;
    // Ensure crop state exists for selected platform
    if (!this.cropState[platform]) {
      this.cropState[platform] = { ...this.defaultCrop };
    }
    this.imageLoaded = false;
  }

  closeModal(): void {
    this.close.emit();
  }

  getDisplayDimensions(platform: Platform): { width: number; height: number } {
    const clamped = Math.min(Math.max(this.displayMaxWidth, 200), 800);
    return this.platformPreview.getDisplaySize(platform, clamped);
  }

  // Crop helpers
  getCrop(platform: Platform): CropAdjustment {
    return this.cropState[platform] ?? this.defaultCrop;
  }

  setZoom(platform: Platform, value: number): void {
    const current = this.getCrop(platform);
    // Clamp zoom 1x - 3x
    const zoom = Math.min(Math.max(value, 1), 3);
    this.cropState[platform] = { ...current, zoom };
  }

  setOffset(platform: Platform, axis: 'offsetX' | 'offsetY', value: number): void {
    const current = this.getCrop(platform);
    // Clamp pan between -100% and 100%
    const v = Math.min(Math.max(value, -100), 100);
    this.cropState[platform] = { ...current, [axis]: v };
  }

  imageStyle(platform: Platform): { [key: string]: string } {
    const crop = this.getCrop(platform);
    return {
      transform: `translate(${crop.offsetX}%, ${crop.offsetY}%) scale(${crop.zoom})`,
      transformOrigin: 'center center',
      willChange: 'transform'
    };
  }
  onImageLoad(): void {
    this.imageLoaded = true;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open) {
      this.closeModal();
    }
  }

  getPlatformIcon(platform: Platform): string {
    return this.platformMeta[platform]?.icon ?? 'fa-solid fa-link';
  }

  getPlatformName(platform: Platform): string {
    return this.platformMeta[platform]?.label ?? platform;
  }

  private syncPlatforms(): void {
    this.platformAspects.clear();
    (this.targets ?? []).forEach((platform) => {
      const aspect = this.platformPreview.getAspect(platform);
      this.platformAspects.set(platform, aspect);
      // Seed default crop per platform
      if (!this.cropState[platform]) {
        this.cropState[platform] = { ...this.defaultCrop };
      }
    });

    if (!this.targets?.length) {
      this.selectedPlatform = null;
      return;
    }

    if (!this.selectedPlatform || !this.targets.includes(this.selectedPlatform)) {
      this.selectedPlatform = this.targets[0];
    }
  }
}
