import { Component, Input, Output, EventEmitter, inject, computed } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FileUploadComponent, UploadedFile } from '../../../../shared/file-upload/file-upload.component';
import { PostFormValidatorService } from '../../../../services/shared/post-form-validator.service';
import { PostMediaService } from '../../../../services/shared/post-media.service';
import { PostEditorWizardService } from '../../../../services/shared/post-editor-wizard.service';

@Component({
  selector: 'app-step1-content-media',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FileUploadComponent],
  templateUrl: './step1-content-media.component.html',
  styleUrl: './step1-content-media.component.css',
})
export class Step1ContentMediaComponent {
  private readonly formValidator = inject(PostFormValidatorService);
  private readonly postMediaService = inject(PostMediaService);
  private readonly wizardService = inject(PostEditorWizardService);

  @Input({ required: true }) postForm!: FormGroup;
  @Input() improvingContent = false;
  @Input() showImprovementModal = false;

  @Output() contentInput = new EventEmitter<Event>();
  @Output() improveContent = new EventEmitter<void>();
  @Output() filesSelected = new EventEmitter<File[]>();
  @Output() unacceptedFiles = new EventEmitter<File[]>();
  @Output() sizeLimitExceeded = new EventEmitter<File[]>();
  @Output() fileDeleted = new EventEmitter<string>();
  @Output() fileRetry = new EventEmitter<string>();
  @Output() removeMedia = new EventEmitter<void>();

  readonly mediaPreview = this.postMediaService.mediaPreview;
  readonly isVideo = this.postMediaService.isVideo;
  readonly uploadedFiles = this.postMediaService.uploadedFiles;
  readonly step1Valid = computed(() => {
    const content = this.postForm.get('content')?.value || '';
    const hasContent = this.formValidator.hasContent(content);
    const hasMedia = !!this.mediaPreview();
    return this.wizardService.validateStep1(hasContent, hasMedia).valid;
  });
  readonly step1ValidationError = computed(() => {
    const content = this.postForm.get('content')?.value || '';
    const hasContent = this.formValidator.hasContent(content);
    const hasMedia = !!this.mediaPreview();
    return !this.wizardService.validateStep1(hasContent, hasMedia).valid;
  });
  readonly characterCount = computed(() => {
    const content = this.postForm.get('content')?.value || '';
    return this.formValidator.getCharacterCount(content);
  });
  readonly maxCharacters = this.formValidator.MAX_CONTENT_LENGTH;
  readonly hasContent = computed(() => {
    const content = this.postForm.get('content')?.value || '';
    return this.formValidator.hasContent(content);
  });

  get content() {
    return this.postForm.get('content');
  }

  onContentInput(event: Event): void {
    this.contentInput.emit(event);
  }

  onImproveContent(): void {
    this.improveContent.emit();
  }

  onFilesSelected(files: File[]): void {
    this.filesSelected.emit(files);
  }

  onUnacceptedFiles(files: File[]): void {
    this.unacceptedFiles.emit(files);
  }

  onSizeLimitExceeded(files: File[]): void {
    this.sizeLimitExceeded.emit(files);
  }

  onFileDeleted(fileId: string): void {
    this.fileDeleted.emit(fileId);
  }

  onFileRetry(fileId: string): void {
    this.fileRetry.emit(fileId);
  }

  onRemoveMedia(): void {
    this.removeMedia.emit();
  }
}

