import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { PhotoCropComponent } from '../../photo-crop/photo-crop.component';
import { PostMediaService } from '../../../../services/shared/post-media.service';
import { PostDraftService } from '../../../../services/client/post-draft.service';
import { Platform } from '../../../../models/social.models';

@Component({
  selector: 'app-step3-crop-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PhotoCropComponent],
  templateUrl: './step3-crop-edit.component.html',
  styleUrl: './step3-crop-edit.component.css',
})
export class Step3CropEditComponent {
  private readonly postMediaService = inject(PostMediaService);
  private readonly draftService = inject(PostDraftService);

  @Input({ required: true }) postForm!: FormGroup;
  @Output() contentInput = new EventEmitter<Event>();
  @Output() cropConfigsChange = new EventEmitter<
    Record<
      Platform,
      {
        crop: { zoom: number; offsetX: number; offsetY: number };
        cropBox: { width: number; height: number; left: number; top: number };
      }
    >
  >();
  @Output() croppedImagesChange = new EventEmitter<Record<Platform, string>>();

  readonly mediaPreview = this.postMediaService.mediaPreview;
  readonly isVideo = this.postMediaService.isVideo;
  
  get selectedPlatforms(): Platform[] {
    const draft = this.draftService.getActiveDraft();
    return draft?.selectedPlatforms || [];
  }

  onContentInput(event: Event): void {
    this.contentInput.emit(event);
  }

  onCropConfigsChange(
    configs: Record<
      Platform,
      {
        crop: { zoom: number; offsetX: number; offsetY: number };
        cropBox: { width: number; height: number; left: number; top: number };
      }
    >,
  ): void {
    this.cropConfigsChange.emit(configs);
  }

  onCroppedImagesChange(croppedImages: Record<Platform, string>): void {
    this.croppedImagesChange.emit(croppedImages);
  }
}

