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
  @Output() croppedImagesChange = new EventEmitter<Record<Platform, string>>(); // Base64 cropped images

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
    const newBox = {
      ...box,
      left: this.initialLeft() + dx,
      top: this.initialTop() + dy,
    };
    this.cropBox.set(newBox);
    
    // Update transform in real-time while dragging
    this.updateTransformFromCropBox();
  }

  /**
   * Stop dragging crop box
   */
  stopDragCropBox(): void {
    if (this.isDraggingCropBox()) {
      // Save crop box state to platform and crop image
      const platform = this.selectedPlatform();
      if (platform) {
        this.saveCropBoxToPlatform(platform).catch(err => console.error('Error saving crop:', err));
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
    
    // Update transform in real-time while resizing
    this.updateTransformFromCropBox();
  }

  /**
   * Update image transform based on current crop box position and size
   * This ensures the preview matches what's shown in the crop box
   */
  private updateTransformFromCropBox(): void {
    const platform = this.selectedPlatform();
    if (!platform) return;
    
    const states = this.platformCropStates();
    const state = states.get(platform);
    if (!state) return;
    
    // Calculate image transform based on crop box position and size
    const displayDims = this.getDisplayDimensions(platform);
    const containerWidth = displayDims.width;
    const containerHeight = displayDims.height;
    const cropBox = this.cropBox();
    
    // Calculate zoom: how much the image needs to be scaled to show the crop box area
    // If crop box is smaller than container, we need to zoom in
    // The zoom should make the crop box area fill the entire container
    const zoomX = containerWidth / cropBox.width;
    const zoomY = containerHeight / cropBox.height;
    // Use the larger ratio to ensure the crop box area completely fills the container
    const zoom = Math.max(zoomX, zoomY, 1);
    
    // Calculate offset: pan the image so the crop box area is centered in the view
    // The crop box center position relative to the container
    const cropBoxCenterX = cropBox.left + cropBox.width / 2;
    const cropBoxCenterY = cropBox.top + cropBox.height / 2;
    const containerCenterX = containerWidth / 2;
    const containerCenterY = containerHeight / 2;
    
    // Calculate the difference between crop box center and container center
    // This tells us how much the image needs to move
    const deltaX = cropBoxCenterX - containerCenterX;
    const deltaY = cropBoxCenterY - containerCenterY;
    
    // Convert pixel offset to percentage
    // Since transform-origin is center center, we need to account for the zoom
    // When zoomed in, the same pixel movement requires a larger percentage offset
    const offsetX = -(deltaX / containerWidth) * 100 * zoom;
    const offsetY = -(deltaY / containerHeight) * 100 * zoom;
    
    // Update crop transform to match crop box
    state.crop = {
      zoom: Math.min(Math.max(zoom, 1), 3), // Clamp zoom between 1 and 3
      offsetX: Math.min(Math.max(offsetX, -100), 100), // Clamp offset
      offsetY: Math.min(Math.max(offsetY, -100), 100),
    };
    
    states.set(platform, { ...state });
    this.platformCropStates.set(new Map(states));
    
    // Emit crop configs change immediately so draft is updated in real-time
    this.cropConfigsChange.emit(this.getCropConfigurations());
  }

  /**
   * Stop resizing crop box
   */
  stopResize(): void {
    if (this.isResizingCrop()) {
      // Save crop box state to platform and crop image
      const platform = this.selectedPlatform();
      if (platform) {
        this.saveCropBoxToPlatform(platform).catch(err => console.error('Error saving crop:', err));
      }
    }
    this.isResizingCrop.set(false);
    this.activeHandle.set(null);
  }

  /**
   * Save crop box state to platform
   */
  private async saveCropBoxToPlatform(platform: Platform): Promise<void> {
    const states = this.platformCropStates();
    const state = states.get(platform);
    if (state) {
      state.cropBox = { ...this.cropBox() };
      
      // Update transform to match crop box
      this.updateTransformFromCropBox();
      
      // Emit the updated configurations
      this.cropConfigsChange.emit(this.getCropConfigurations());
      
      // Crop the image for this platform and emit
      const croppedImage = await this.cropImageForPlatform(platform);
      if (croppedImage) {
        const currentCropped = { ...this.getCroppedImages() };
        currentCropped[platform] = croppedImage;
        this.croppedImagesCache.set(currentCropped);
        this.croppedImagesChange.emit(currentCropped);
      }
    }
  }

  /**
   * Get current cropped images (stored in component state)
   */
  private croppedImagesCache = signal<Record<Platform, string>>({} as Record<Platform, string>);
  
  private getCroppedImages(): Record<Platform, string> {
    return this.croppedImagesCache();
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
   * Crop image for a specific platform and return base64 string
   * This crops the image exactly as shown in the preview
   * 
   * The crop calculation:
   * 1. Maps cropBox (container coordinates) to displayed image coordinates
   * 2. Accounts for zoom/pan transform applied to the image
   * 3. Maps displayed coordinates to original image coordinates
   * 4. Extracts exact region and scales to crop box dimensions
   */
  async cropImageForPlatform(platform: Platform): Promise<string | null> {
    if (!this.mediaUrl || !this.imageLoaded()) return null;

    const state = this.platformCropStates().get(platform);
    if (!state) return null;

    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const displayDims = this.getDisplayDimensions(platform);
          const containerWidth = displayDims.width;
          const containerHeight = displayDims.height;
          const cropBox = state.cropBox;
          const crop = state.crop;

          // Step 1: Calculate how the original image is displayed in the container (object-cover behavior)
          const containerAspect = containerWidth / containerHeight;
          const imageAspect = img.width / img.height;
          
          let displayedWidth: number;
          let displayedHeight: number;
          let imageOffsetX = 0;
          let imageOffsetY = 0;

          if (imageAspect > containerAspect) {
            // Image is wider than container - fit to height, crop width
            displayedHeight = containerHeight;
            displayedWidth = img.width * (containerHeight / img.height);
            imageOffsetX = (containerWidth - displayedWidth) / 2;
          } else {
            // Image is taller than container - fit to width, crop height
            displayedWidth = containerWidth;
            displayedHeight = img.height * (containerWidth / img.width);
            imageOffsetY = (containerHeight - displayedHeight) / 2;
          }

          // Step 2: Calculate scale factor from displayed size to original image size
          const scaleX = img.width / displayedWidth;
          const scaleY = img.height / displayedHeight;

          // Step 3: Account for the CSS transform applied in the editor
          // The image has: transform: translate(offsetX%, offsetY%) scale(zoom)
          // Transform origin is 'center center', so transforms happen around container center
          const zoom = crop.zoom;
          const containerCenterX = containerWidth / 2;
          const containerCenterY = containerHeight / 2;
          
          // Calculate crop box center in container coordinates
          const cropBoxCenterX = cropBox.left + cropBox.width / 2;
          const cropBoxCenterY = cropBox.top + cropBox.height / 2;

          // Step 4: Reverse the CSS transform to find what part of the displayed image
          // corresponds to the crop box position
          // 
          // CSS transform: translate(offsetX%, offsetY%) scale(zoom) with origin center center
          // Transform order (right to left): scale happens first, then translate
          // But with center origin, both happen around the center point
          //
          // To find what's visible in the crop box:
          // 1. Crop box center in container coordinates
          // 2. Reverse the transform to find corresponding point in untransformed image
          
          // Calculate offset in pixels (percentage of displayed image size)
          const offsetXPixels = (crop.offsetX / 100) * displayedWidth;
          const offsetYPixels = (crop.offsetY / 100) * displayedHeight;
          
          // Transform origin is center center, so we work relative to container center
          const relativeX = cropBoxCenterX - containerCenterX;
          const relativeY = cropBoxCenterY - containerCenterY;
          
          // Reverse the transform chain:
          // In CSS: translate then scale (but applied right-to-left, so scale first, then translate)
          // To reverse: undo translate first, then undo scale
          
          // Step 1: Reverse the translation (subtract the offset)
          const afterTranslateX = relativeX - offsetXPixels;
          const afterTranslateY = relativeY - offsetYPixels;
          
          // Step 2: Reverse the scale (divide by zoom, around center)
          const unzoomedX = afterTranslateX / zoom;
          const unzoomedY = afterTranslateY / zoom;
          
          // Step 3: Convert back to absolute coordinates in displayed image space
          let displayedCropCenterX = containerCenterX + unzoomedX - imageOffsetX;
          let displayedCropCenterY = containerCenterY + unzoomedY - imageOffsetY;

          // Step 5: Map displayed image coordinates to original image coordinates
          const sourceCenterX = displayedCropCenterX * scaleX;
          const sourceCenterY = displayedCropCenterY * scaleY;
          
          // Crop box size in original image coordinates (account for zoom)
          // The crop box appears smaller when zoomed, so we divide by zoom
          const sourceWidth = (cropBox.width * scaleX) / zoom;
          const sourceHeight = (cropBox.height * scaleY) / zoom;

          // Step 8: Calculate final source rectangle, ensuring it stays within image bounds
          const sourceX = Math.max(0, Math.min(img.width - sourceWidth, sourceCenterX - sourceWidth / 2));
          const sourceY = Math.max(0, Math.min(img.height - sourceHeight, sourceCenterY - sourceHeight / 2));
          const finalSourceWidth = Math.min(sourceWidth, img.width - sourceX);
          const finalSourceHeight = Math.min(sourceHeight, img.height - sourceY);

          // Step 9: Create canvas with platform display dimensions
          // The crop box is positioned on the platform-sized container, so we extract
          // the crop box region and scale it to fill the platform dimensions
          // This ensures the preview shows exactly what was visible in the crop box
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.floor(containerWidth));
          canvas.height = Math.max(1, Math.floor(containerHeight));
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            resolve(null);
            return;
          }

          // Step 10: Draw the cropped region scaled to fill the platform container
          // The crop box defines what portion of the transformed image is visible
          // We extract that exact region and scale it to fill the canvas (platform dimensions)
          // This matches what the user sees: the crop box content filling the platform container
          ctx.drawImage(
            img,
            sourceX, sourceY, finalSourceWidth, finalSourceHeight, // Source rectangle in original image
            0, 0, canvas.width, canvas.height // Destination rectangle (platform dimensions - fills container)
          );

          // Convert to base64 PNG for consistent quality
          const base64 = canvas.toDataURL('image/png');
          resolve(base64);
        } catch (error) {
          console.error('Error cropping image:', error);
          resolve(null);
        }
      };
      img.onerror = () => {
        console.error('Error loading image for cropping');
        resolve(null);
      };
      img.src = this.mediaUrl;
    });
  }

  /**
   * Crop images for all platforms and emit cropped images
   */
  async cropAllImages(): Promise<void> {
    const croppedImages: Record<Platform, string> = { ...this.getCroppedImages() };
    const platforms = this.selectedPlatforms.length > 0 ? this.selectedPlatforms : this.allPlatforms;

    for (const platform of platforms) {
      const cropped = await this.cropImageForPlatform(platform);
      if (cropped) {
        croppedImages[platform] = cropped;
      }
    }

    this.croppedImagesCache.set(croppedImages);
    this.croppedImagesChange.emit(croppedImages);
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

