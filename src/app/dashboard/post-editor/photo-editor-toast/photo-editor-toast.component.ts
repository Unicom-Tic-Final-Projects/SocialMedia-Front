import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  signal,
  computed,
  inject,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import ImageEditor from 'tui-image-editor';
import 'tui-image-editor/dist/tui-image-editor.css';
import { Platform, CropAdjustment, SocialAccount } from '../../../models/social.models';
import { PlatformPreviewService } from '../../../services/client/platform-preview.service';
import { SocialAccountsService } from '../../../services/client/social-accounts.service';
import { LoggingService } from '../../../core/services/logging.service';

interface PlatformMeta {
  icon: string;
  label: string;
  color: string;
}

@Component({
  selector: 'app-photo-editor-toast',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './photo-editor-toast.component.html',
  styleUrl: './photo-editor-toast.component.css',
})
export class PhotoEditorToastComponent implements OnInit, OnChanges, OnDestroy {
  @Input() mediaUrl: string = '';
  @Input() mediaType: 'image' | 'video' | null = null;
  @Input() caption: string = '';
  @Input() selectedAccountIds: string[] = [];
  @Input() selectedPlatforms: Platform[] = [];

  @Output() cropConfigsChange = new EventEmitter<
    Record<
      Platform,
      {
        crop: CropAdjustment;
        cropBox: { width: number; height: number; left: number; top: number };
      }
    >
  >();
  @Output() croppedImagesChange = new EventEmitter<Record<Platform, string>>();

  @ViewChild('editorContainer', { static: false }) editorContainer!: ElementRef<HTMLDivElement>;

  // All available platforms
  readonly allPlatforms: Platform[] = [
    'facebook',
    'instagram',
    'twitter',
    'linkedin',
    'youtube',
    'tiktok',
    'pinterest',
  ];

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

  private editor: ImageEditor | null = null;
  private platformCrops: Map<Platform, string> = new Map();
  private platformCropConfigs: Map<
    Platform,
    {
      crop: CropAdjustment;
      cropBox: { width: number; height: number; left: number; top: number };
    }
  > = new Map();

  selectedPlatform = signal<Platform | null>(null);
  loading = signal(false);

  private readonly platformPreview = inject(PlatformPreviewService);
  private readonly socialAccountsService = inject(SocialAccountsService);
  private readonly loggingService = inject(LoggingService);

  get socialAccounts() {
    return this.socialAccountsService.accounts();
  }

  ngOnInit() {
    this.initializePlatforms();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['mediaUrl'] && this.mediaUrl && !this.isVideo()) {
      // Delay initialization to ensure container is ready
      setTimeout(() => {
        this.initEditor();
      }, 100);
    }

    if (changes['selectedPlatforms'] || changes['selectedAccountIds']) {
      this.initializePlatforms();
    }
  }

  ngOnDestroy() {
    if (this.editor) {
      try {
        this.editor.destroy();
      } catch (error) {
        this.loggingService.error('Error destroying editor', error, 'PhotoEditorToast');
      }
    }
  }

  isVideo(): boolean {
    if (this.mediaType) {
      return this.mediaType === 'video';
    }
    if (!this.mediaUrl) return false;
    const url = this.mediaUrl.toLowerCase();
    return (
      url.includes('video') ||
      url.endsWith('.mp4') ||
      url.endsWith('.mov') ||
      url.endsWith('.webm') ||
      url.endsWith('.avi') ||
      url.startsWith('data:video/')
    );
  }

  private initializePlatforms() {
    const platforms = this.selectedPlatforms.length > 0 ? this.selectedPlatforms : this.allPlatforms;
    if (platforms.length > 0 && !this.selectedPlatform()) {
      this.selectedPlatform.set(platforms[0]);
    }
  }

  private async initEditor() {
    if (!this.mediaUrl || this.isVideo() || !this.editorContainer) {
      return;
    }

    if (this.editor) {
      this.editor.destroy();
    }

    this.loading.set(true);

    try {
      const aspect = this.selectedPlatform()
        ? this.platformPreview.getAspect(this.selectedPlatform()!)
        : this.platformPreview.getAspect('instagram');

      // Calculate aspect ratio
      const aspectRatio = aspect.width / aspect.height;

      // Calculate available height for editor
      const containerHeight = this.editorContainer.nativeElement.clientHeight || 800;
      const editorHeight = Math.max(containerHeight, 800);

      this.editor = new ImageEditor(this.editorContainer.nativeElement, {
        includeUI: {
          loadImage: {
            path: this.mediaUrl,
            name: 'image',
          },
          theme: {
            'common.bi.image': '',
            'common.bisize.width': '0px',
            'common.backgroundImage': 'none',
            'common.backgroundColor': '#ffffff',
            'common.border': '1px solid #e5e5e5',
          } as any, // Use 'as any' to allow custom theme properties
          menu: ['crop', 'flip', 'rotate', 'draw', 'shape', 'icon', 'text', 'filter'],
          initMenu: 'crop',
          uiSize: {
            width: '100%',
            height: `${editorHeight}px`,
          },
          menuBarPosition: 'bottom',
        },
        cssMaxWidth: Math.min(1600, window.innerWidth - 100),
        cssMaxHeight: editorHeight,
        selectionStyle: {
          cornerSize: 20,
          rotatingPointOffset: 70,
        },
        usageStatistics: false,
      });

      // Wait for image to load before setting aspect ratio
      this.editor.on('imageLoaded', () => {
        // Set aspect ratio for crop after image is loaded
        setTimeout(() => {
          this.setAspectRatio(aspectRatio);
          // Toast UI Image Editor handles zoom automatically
          // The image should be visible and properly sized by default
        }, 200);
      });

      // Set aspect ratio for crop (fallback if event doesn't fire)
      setTimeout(() => {
        this.setAspectRatio(aspectRatio);
      }, 1000);

      // Listen for crop changes
      this.editor.on('objectActivated', () => {
        this.saveCropForPlatform();
      });

      this.editor.on('objectMoved', () => {
        this.saveCropForPlatform();
      });

      this.loading.set(false);
      this.loggingService.debug('Toast UI Image Editor initialized', { aspect }, 'PhotoEditorToast');
    } catch (error) {
      this.loggingService.error('Error initializing Toast UI editor', error, 'PhotoEditorToast');
      this.loading.set(false);
    }
  }

  private setAspectRatio(ratio: number) {
    if (!this.editor) return;

    try {
      // Toast UI doesn't have direct aspect ratio API, but we can set crop selection
      // The user will need to manually crop to the aspect ratio
      // We can show guidelines or use the crop tool
      this.editor.startDrawingMode('CROPPER');
    } catch (error) {
      this.loggingService.error('Error setting aspect ratio', error, 'PhotoEditorToast');
    }
  }

  selectPlatform(platform: Platform) {
    // Save current crop before switching
    this.saveCropForPlatform();

    // Switch platform
    this.selectedPlatform.set(platform);

    // Reload editor with new aspect ratio if needed
    if (this.editor && this.mediaUrl && !this.isVideo()) {
      const aspect = this.platformPreview.getAspect(platform);
      const aspectRatio = aspect.width / aspect.height;
      this.setAspectRatio(aspectRatio);
    }
  }

  private saveCropForPlatform() {
    if (!this.editor || !this.selectedPlatform()) return;

    try {
      const platform = this.selectedPlatform()!;
      const imageData = this.editor.toDataURL();

      // Save cropped image
      this.platformCrops.set(platform, imageData);

      // Get crop info (Toast UI doesn't expose crop coordinates directly)
      // We'll use default crop config structure
      const aspect = this.platformPreview.getAspect(platform);
      const cropConfig = {
        crop: { zoom: 1, offsetX: 0, offsetY: 0 } as CropAdjustment,
        cropBox: {
          width: aspect.width,
          height: aspect.height,
          left: 0,
          top: 0,
        },
      };

      this.platformCropConfigs.set(platform, cropConfig);

      // Emit cropped images
      const croppedImages: Partial<Record<Platform, string>> = {};
      this.platformCrops.forEach((data, p) => {
        croppedImages[p] = data;
      });
      this.croppedImagesChange.emit(croppedImages as Record<Platform, string>);

      // Emit crop configs
      const cropConfigs: Partial<
        Record<
          Platform,
          {
            crop: CropAdjustment;
            cropBox: { width: number; height: number; left: number; top: number };
          }
        >
      > = {};
      this.platformCropConfigs.forEach((config, p) => {
        cropConfigs[p] = config;
      });
      this.cropConfigsChange.emit(cropConfigs as Record<
        Platform,
        {
          crop: CropAdjustment;
          cropBox: { width: number; height: number; left: number; top: number };
        }
      >);

      this.loggingService.debug('Crop saved for platform', { platform }, 'PhotoEditorToast');
    } catch (error) {
      this.loggingService.error('Error saving crop', error, 'PhotoEditorToast');
    }
  }

  getPlatformAspect(platform: Platform) {
    return this.platformPreview.getAspect(platform);
  }

  getDisplayDimensions(platform: Platform, maxWidth: number = 360) {
    return this.platformPreview.getDisplaySize(platform, maxWidth);
  }

  getCropState(platform: Platform) {
    return this.platformCrops.has(platform);
  }
}

