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
} from '@angular/core';
import { CommonModule, NgStyle } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Platform, CropAdjustment, SocialAccount } from '../../../models/social.models';
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
  selector: 'app-photo-crop',
  standalone: true,
  imports: [CommonModule, FormsModule, NgStyle],
  templateUrl: './photo-crop.component.html',
  styleUrl: './photo-crop.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhotoCropComponent implements OnChanges {
  @Input() mediaUrl: string = '';
  @Input() caption: string = '';
  @Input() selectedAccountIds: string[] = [];
  @Input() selectedPlatforms: Platform[] = []; // Platforms selected in Step 2
  @Output() cropConfigsChange = new EventEmitter<Record<Platform, { crop: CropAdjustment; cropBox: { width: number; height: number; left: number; top: number } }>>();

  // All available platforms
  readonly allPlatforms: Platform[] = ['facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'tiktok', 'pinterest'];

  // Platform metadata
  readonly platformMeta: Record<Platform, PlatformMeta> = {
    facebook: { icon: 'fa-brands fa-facebook-f', label: 'Facebook', color: '#1877F2' },
    instagram: { icon: 'fa-brands fa-instagram', label: 'Instagram', color: '#E1306C' },
    twitter: { icon: 'fa-brands fa-x-twitter', label: 'X (Twitter)', color: '#1DA1F2' },
    linkedin: { icon: 'fa-brands fa-linkedin-in', label: 'LinkedIn', color: '#0A66C2' },
    youtube: { icon: 'fa-brands fa-youtube', label: 'YouTube', color: '#FF0000' },
    tiktok: { icon: 'fa-brands fa-tiktok', label: 'TikTok', color: '#000000' },
    pinterest: { icon: 'fa-brands fa-pinterest', label: 'Pinterest', color: '#E60023' },
  };

  // Selected platform for editing
  selectedPlatform = signal<Platform | null>(null);

  // Crop states for each platform
  platformCropStates = signal<Map<Platform, PlatformCropState>>(new Map());

  // Free-form crop box state (for currently selected platform)
  cropBox = signal({
    width: 280,
    height: 300,
    left: 40,
    top: 100,
  });

  // Drag/resize state
  isDraggingCropBox = signal(false);
  isResizingCrop = signal(false);
  activeHandle = signal<string | null>(null);
  dragStartX = signal(0);
  dragStartY = signal(0);
  initialLeft = signal(0);
  initialTop = signal(0);
  initialWidth = signal(0);
  initialHeight = signal(0);

  // Image loaded state
  imageLoaded = signal(false);
  displayMaxWidth = 350;

  // Default crop adjustment
  private readonly defaultCrop: CropAdjustment = { zoom: 1, offsetX: 0, offsetY: 0 };

  constructor(
    private readonly platformPreview: PlatformPreviewService,
    private readonly socialAccountsService: SocialAccountsService
  ) {}

  // Get all social accounts (initialized after constructor)
  get socialAccounts() {
    return this.socialAccountsService.accounts();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedAccountIds'] || changes['mediaUrl'] || changes['selectedPlatforms']) {
      this.initializePlatformStates();
    }
  }

  /**
   * Initialize crop states for all platforms with default configurations
   */
  private initializePlatformStates(): void {
    const states = new Map<Platform, PlatformCropState>();
    const accounts = this.socialAccounts;
    const selectedIds = this.selectedAccountIds || [];

    this.allPlatforms.forEach((platform) => {
      // Find account for this platform
      const account = accounts.find(
        (acc) => acc.platform === platform && acc.status === 'connected'
      );
      // Platform is "connected" if it's in the selected platforms list (from Step 2)
      // OR if there's a connected account and it's in selectedAccountIds
      const isInSelectedPlatforms = this.selectedPlatforms.includes(platform);
      const isConnected = isInSelectedPlatforms || (!!account && selectedIds.includes(account.id));

      // Get default aspect ratio for platform
      const aspect = this.platformPreview.getAspect(platform);
      
      // Initialize crop box with default dimensions based on platform
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

    // Emit initial crop configurations
    this.cropConfigsChange.emit(this.getCropConfigurations());

    // Auto-select first selected platform (from Step 2) or first available platform
    if (!this.selectedPlatform()) {
      const firstSelected = this.selectedPlatforms.length > 0 ? this.selectedPlatforms[0] : this.allPlatforms[0];
      if (firstSelected) {
        this.selectPlatform(firstSelected);
      }
    }
  }

  /**
   * Select a platform for editing
   */
  selectPlatform(platform: Platform): void {
    this.selectedPlatform.set(platform);
    const state = this.platformCropStates().get(platform);
    if (state) {
      this.cropBox.set({ ...state.cropBox });
    }
    this.imageLoaded.set(false);
  }

  /**
   * Get crop state for platform
   */
  getCropState(platform: Platform): PlatformCropState | undefined {
    return this.platformCropStates().get(platform);
  }

  /**
   * Check if platform is connected
   */
  isPlatformConnected(platform: Platform): boolean {
    return this.getCropState(platform)?.isConnected ?? false;
  }

  /**
   * Get display dimensions for platform
   */
  getDisplayDimensions(platform: Platform): { width: number; height: number } {
    const clamped = Math.min(Math.max(this.displayMaxWidth, 200), 800);
    return this.platformPreview.getDisplaySize(platform, clamped);
  }

  /**
   * Get platform aspect ratio info
   */
  getPlatformAspect(platform: Platform) {
    return this.platformPreview.getAspect(platform);
  }

  /**
   * Get crop adjustment for platform
   */
  getCrop(platform: Platform): CropAdjustment {
    const state = this.getCropState(platform);
    return state?.crop ?? { ...this.defaultCrop };
  }

  /**
   * Set zoom for platform
   */
  setZoom(platform: Platform, value: number): void {
    const states = this.platformCropStates();
    const state = states.get(platform);
    if (state) {
      const zoom = Math.min(Math.max(value, 1), 3);
      state.crop = { ...state.crop, zoom };
      states.set(platform, { ...state });
      this.platformCropStates.set(new Map(states));
      this.cropConfigsChange.emit(this.getCropConfigurations());
    }
  }

  /**
   * Set offset for platform
   */
  setOffset(platform: Platform, axis: 'offsetX' | 'offsetY', value: number): void {
    const states = this.platformCropStates();
    const state = states.get(platform);
    if (state) {
      const v = Math.min(Math.max(value, -100), 100);
      state.crop = { ...state.crop, [axis]: v };
      states.set(platform, { ...state });
      this.platformCropStates.set(new Map(states));
      this.cropConfigsChange.emit(this.getCropConfigurations());
    }
  }

  /**
   * Get image style with crop adjustments
   */
  imageStyle(platform: Platform): { [key: string]: string } {
    const crop = this.getCrop(platform);
    return {
      transform: `translate(${crop.offsetX}%, ${crop.offsetY}%) scale(${crop.zoom})`,
      transformOrigin: 'center center',
      willChange: 'transform',
    };
  }

  /**
   * Handle image load
   */
  onImageLoad(): void {
    this.imageLoaded.set(true);
  }

  /**
   * Start dragging crop box
   */
  startDragCropBox(event: MouseEvent | TouchEvent): void {
    if (this.isResizingCrop()) return;
    this.isDraggingCropBox.set(true);
    this.dragStartX.set('touches' in event ? event.touches[0].clientX : event.clientX);
    this.dragStartY.set('touches' in event ? event.touches[0].clientY : event.clientY);
    const box = this.cropBox();
    this.initialLeft.set(box.left);
    this.initialTop.set(box.top);
  }

  /**
   * Move crop box while dragging
   */
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

  /**
   * Stop dragging crop box
   */
  stopDragCropBox(): void {
    if (this.isDraggingCropBox()) {
      // Save crop box state to platform
      const platform = this.selectedPlatform();
      if (platform) {
        this.saveCropBoxToPlatform(platform);
      }
    }
    this.isDraggingCropBox.set(false);
  }

  /**
   * Start resizing crop box
   */
  startResize(event: MouseEvent, handle: string): void {
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

  /**
   * Move resize handle
   */
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

  /**
   * Stop resizing crop box
   */
  stopResize(): void {
    if (this.isResizingCrop()) {
      // Save crop box state to platform
      const platform = this.selectedPlatform();
      if (platform) {
        this.saveCropBoxToPlatform(platform);
      }
    }
    this.isResizingCrop.set(false);
    this.activeHandle.set(null);
  }

  /**
   * Save crop box state to platform
   */
  private saveCropBoxToPlatform(platform: Platform): void {
    const states = this.platformCropStates();
    const state = states.get(platform);
    if (state) {
      state.cropBox = { ...this.cropBox() };
      states.set(platform, { ...state });
      this.platformCropStates.set(new Map(states));
      this.cropConfigsChange.emit(this.getCropConfigurations());
    }
  }

  /**
   * Get all crop configurations for saving
   */
  getCropConfigurations(): Record<Platform, { crop: CropAdjustment; cropBox: { width: number; height: number; left: number; top: number } }> {
    const configs: Record<Platform, { crop: CropAdjustment; cropBox: { width: number; height: number; left: number; top: number } }> = {} as any;
    this.platformCropStates().forEach((state, platform) => {
      configs[platform] = {
        crop: { ...state.crop },
        cropBox: { ...state.cropBox },
      };
    });
    return configs;
  }

  /**
   * Handle mouse move globally
   */
  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (this.isDraggingCropBox()) {
      this.moveCropBox(event);
    } else if (this.isResizingCrop()) {
      this.moveResize(event);
    }
  }

  /**
   * Handle mouse up globally
   */
  @HostListener('document:mouseup')
  onMouseUp(): void {
    this.stopDragCropBox();
    this.stopResize();
  }
}

