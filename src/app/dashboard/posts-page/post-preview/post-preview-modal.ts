import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges
} from '@angular/core';
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

  /** Platform selection - NEVER NULL */
  selectedPlatform!: Platform;

  /** Platform aspect ratios */
  readonly platformAspects = new Map<
    Platform,
    { width: number; height: number; label: string; description?: string }
  >();

  /** Preview size slider */
  displayMaxWidth = 350;

  /** Default zoom + pan */
  private readonly defaultCrop: CropAdjustment = {
    zoom: 1,
    offsetX: 0,
    offsetY: 0
  };

  /** Per-platform crop memory */
  private cropState: Record<Platform, CropAdjustment> = {} as Record<
    Platform,
    CropAdjustment
  >;

  imageLoaded = false;

  readonly platformMeta: Record<Platform, PlatformMeta> = {
    facebook: { icon: 'fa-brands fa-facebook-f', label: 'Facebook' },
    instagram: { icon: 'fa-brands fa-instagram', label: 'Instagram' },
    twitter: { icon: 'fa-brands fa-x-twitter', label: 'X (Twitter)' },
    linkedin: { icon: 'fa-brands fa-linkedin-in', label: 'LinkedIn' },
    youtube: { icon: 'fa-brands fa-youtube', label: 'YouTube' },
  };

  /** ---------- FREE FORM CROP BOX STATE ---------- */
  cropBox = {
    width: 280,
    height: 300,
    left: 40,
    top: 100,
  };

  isDraggingImage = false;
  isResizingCrop = false;
  activeHandle: string | null = null;

  dragStartX = 0;
  dragStartY = 0;
  initialLeft = 0;
  initialTop = 0;
  initialWidth = 0;
  initialHeight = 0;

  constructor(private readonly platformPreview: PlatformPreviewService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['targets'] || changes['mediaUrl']) {
      this.imageLoaded = false;
      this.syncPlatforms();
    }
  }

  /** ---------- PLATFORM SELECT ---------- */
  selectPlatform(platform: Platform): void {
    this.selectedPlatform = platform;
    if (!this.cropState[platform]) {
      this.cropState[platform] = { ...this.defaultCrop };
    }
    this.imageLoaded = false;
  }

  /** ---------- CLOSE ---------- */
  closeModal(): void {
    this.close.emit();
  }

  /** ---------- DISPLAY SIZE ---------- */
  getDisplayDimensions(platform: Platform) {
    const clamped = Math.min(Math.max(this.displayMaxWidth, 200), 800);
    return this.platformPreview.getDisplaySize(platform, clamped);
  }

  /** ---------- CROP GETTERS ---------- */
  getCrop(platform: Platform): CropAdjustment {
    return this.cropState[platform] ?? this.defaultCrop;
  }

  setZoom(platform: Platform, value: number) {
    const cur = this.getCrop(platform);
    const zoom = Math.min(Math.max(value, 1), 3);
    this.cropState[platform] = { ...cur, zoom };
  }

  setOffset(platform: Platform, axis: 'offsetX' | 'offsetY', value: number) {
    const cur = this.getCrop(platform);
    const val = Math.min(Math.max(value, -100), 100);
    this.cropState[platform] = { ...cur, [axis]: val };
  }

  /** ---------- IMAGE STYLE ---------- */
  imageStyle(platform: Platform) {
    const c = this.getCrop(platform);
    return {
      transform: `translate(${c.offsetX}%, ${c.offsetY}%) scale(${c.zoom})`,
      transformOrigin: 'center'
    };
  }

  onImageLoad() {
    this.imageLoaded = true;
  }

  /** ---------- ESC TO CLOSE ---------- */
  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.open) this.closeModal();
  }

  /** ---------- META ---------- */
  getPlatformIcon(platform: Platform) {
    return this.platformMeta[platform]?.icon;
  }

  getPlatformName(platform: Platform) {
    return this.platformMeta[platform]?.label;
  }

  /** ---------- SYNC ---------- */
  private syncPlatforms() {
    this.platformAspects.clear();

    for (const p of this.targets ?? []) {
      const asp = this.platformPreview.getAspect(p);
      this.platformAspects.set(p, asp);

      if (!this.cropState[p]) {
        this.cropState[p] = { ...this.defaultCrop };
      }
    }

    if (!this.targets?.length) return;

    if (!this.selectedPlatform || !this.targets.includes(this.selectedPlatform)) {
      this.selectedPlatform = this.targets[0];
    }
  }

  /** ===========================================================
   *  FREE FORM CROP LOGIC
   * =========================================================== */

  /** Start dragging image */
  startImageDrag(event: MouseEvent | TouchEvent) {
    this.isDraggingImage = true;

    this.dragStartX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    this.dragStartY = 'touches' in event ? event.touches[0].clientY : event.clientY;
  }

  moveImage(event: MouseEvent | TouchEvent) {
    if (!this.isDraggingImage) return;
    const moveX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const moveY = 'touches' in event ? event.touches[0].clientY : event.clientY;

    const dx = moveX - this.dragStartX;
    const dy = moveY - this.dragStartY;

    const crop = this.getCrop(this.selectedPlatform);

    this.setOffset(this.selectedPlatform, 'offsetX', crop.offsetX + dx * 0.2);
    this.setOffset(this.selectedPlatform, 'offsetY', crop.offsetY + dy * 0.2);

    this.dragStartX = moveX;
    this.dragStartY = moveY;
  }

  stopImageDrag() {
    this.isDraggingImage = false;
  }

  /** ---------- Resize crop box ---------- */
  startResize(event: MouseEvent, handle: string) {
    event.preventDefault();
    this.isResizingCrop = true;
    this.activeHandle = handle;

    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;

    this.initialWidth = this.cropBox.width;
    this.initialHeight = this.cropBox.height;
    this.initialLeft = this.cropBox.left;
    this.initialTop = this.cropBox.top;
  }

  moveResize(event: MouseEvent) {
    if (!this.isResizingCrop || !this.activeHandle) return;

    const dx = event.clientX - this.dragStartX;
    const dy = event.clientY - this.dragStartY;

    switch (this.activeHandle) {
      case 'r':
        this.cropBox.width = this.initialWidth + dx;
        break;

      case 'l':
        this.cropBox.width = this.initialWidth - dx;
        this.cropBox.left = this.initialLeft + dx;
        break;

      case 'b':
        this.cropBox.height = this.initialHeight + dy;
        break;

      case 't':
        this.cropBox.height = this.initialHeight - dy;
        this.cropBox.top = this.initialTop + dy;
        break;

      case 'br':
        this.cropBox.width = this.initialWidth + dx;
        this.cropBox.height = this.initialHeight + dy;
        break;
    }
  }

  stopResize() {
    this.isResizingCrop = false;
    this.activeHandle = null;
  }
}
