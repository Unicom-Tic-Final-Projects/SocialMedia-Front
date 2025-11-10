// import { Component } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { FormsModule } from '@angular/forms';
// import { ImageCroppedEvent, ImageCropperModule } from 'ngx-image-cropper';
// import { Platform, PlatformPreviewConfig } from '../../../models/social.models';
// import { PlatformPreviewService } from '../../../services/platform-preview.service';

// @Component({
//   selector: 'app-image-crop',
//   standalone: true,
//   imports: [CommonModule, FormsModule, ImageCropperModule],
//   templateUrl: './image-crop.component.html',
//   styleUrls: ['./image-crop.component.css']
// })
// export class ImageCropComponent {
//   selectedPlatform: Platform = 'instagram';

//   imageChangedEvent: any = '';
//   croppedImage: string | null = null;
//   imageLoaded = false;

//   aspect!: PlatformPreviewConfig;

//   constructor(public platformPreviewService: PlatformPreviewService) {
//     this.aspect = this.platformPreviewService.getAspect(this.selectedPlatform);
//   }

//   onFileChange(event: Event): void {
//     this.imageChangedEvent = event;
//   }

//   onImageCropped(event: ImageCroppedEvent) {
//     this.croppedImage = event.base64 ?? null;
//   }

//   onImageLoaded() {
//     this.imageLoaded = true;
//   }

//   onCropperReady() {
//     console.log('Cropper ready for', this.selectedPlatform);
//   }

//   onLoadImageFailed() {
//     console.warn('Image load failed.');
//   }

//   changePlatform(platform: Platform) {
//     this.selectedPlatform = platform;
//     this.aspect = this.platformPreviewService.getAspect(platform);
//   }

//   saveCrop() {
//     if (this.croppedImage) {
//       console.log('Cropped image saved:', this.croppedImage.slice(0, 80) + '...');
//     }
//   }

//   getAspectRatio(): number {
//     return this.aspect.width / this.aspect.height;
//   }
// }
