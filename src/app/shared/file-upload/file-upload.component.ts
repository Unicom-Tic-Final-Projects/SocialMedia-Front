import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  progress: number;
  failed: boolean;
  type?: string;
  preview?: string;
}

/**
 * Returns a human-readable file size.
 */
export function getReadableFileSize(bytes: number): string {
  if (bytes === 0) return '0 KB';
  const suffixes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.floor(bytes / Math.pow(1024, i)) + ' ' + suffixes[i];
}

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './file-upload.component.html',
  styleUrl: './file-upload.component.css'
})
export class FileUploadComponent {
  @ViewChild('fileInput') fileInputRef?: ElementRef<HTMLInputElement>;

  @Input() hint?: string;
  @Input() isDisabled = false;
  @Input() accept?: string; // e.g., "image/*", ".pdf,image/*"
  @Input() allowsMultiple = true;
  @Input() maxSize?: number; // in bytes
  @Input() variant: 'progressBar' | 'progressFill' = 'progressBar';
  @Input() uploadedFiles: UploadedFile[] = [];

  @Output() filesSelected = new EventEmitter<File[]>();
  @Output() unacceptedFiles = new EventEmitter<File[]>();
  @Output() sizeLimitExceeded = new EventEmitter<File[]>();
  @Output() fileDeleted = new EventEmitter<string>();
  @Output() fileRetry = new EventEmitter<string>();

  isDraggingOver = signal(false);
  isInvalid = signal(false);

  readonly getReadableFileSize = getReadableFileSize;

  isFileTypeAccepted(file: File): boolean {
    if (!this.accept) return true;

    const acceptedTypes = this.accept.split(',').map(type => type.trim());

    return acceptedTypes.some(acceptedType => {
      // Handle file extensions (e.g., .pdf, .doc)
      if (acceptedType.startsWith('.')) {
        const extension = '.' + file.name.split('.').pop()?.toLowerCase();
        return extension === acceptedType.toLowerCase();
      }

      // Handle wildcards (e.g., image/*)
      if (acceptedType.endsWith('/*')) {
        const typePrefix = acceptedType.split('/')[0];
        return file.type.startsWith(`${typePrefix}/`);
      }

      // Handle exact MIME types (e.g., application/pdf)
      return file.type === acceptedType;
    });
  }

  handleDragIn(event: DragEvent): void {
    if (this.isDisabled) return;
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOver.set(true);
  }

  handleDragOut(event: DragEvent): void {
    if (this.isDisabled) return;
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOver.set(false);
  }

  processFiles(files: File[]): void {
    this.isInvalid.set(false);

    const acceptedFiles: File[] = [];
    const unacceptedFiles: File[] = [];
    const oversizedFiles: File[] = [];

    const filesToProcess = this.allowsMultiple ? files : files.slice(0, 1);

    filesToProcess.forEach(file => {
      // Check file size first
      if (this.maxSize && file.size > this.maxSize) {
        oversizedFiles.push(file);
        return;
      }

      // Then check file type
      if (this.isFileTypeAccepted(file)) {
        acceptedFiles.push(file);
      } else {
        unacceptedFiles.push(file);
      }
    });

    // Handle oversized files
    if (oversizedFiles.length > 0) {
      this.isInvalid.set(true);
      this.sizeLimitExceeded.emit(oversizedFiles);
    }

    // Handle accepted files
    if (acceptedFiles.length > 0) {
      this.filesSelected.emit(acceptedFiles);
    }

    // Handle unaccepted files
    if (unacceptedFiles.length > 0) {
      this.isInvalid.set(true);
      this.unacceptedFiles.emit(unacceptedFiles);
    }

    // Clear the input value
    if (this.fileInputRef?.nativeElement) {
      this.fileInputRef.nativeElement.value = '';
    }
  }

  handleDrop(event: DragEvent): void {
    if (this.isDisabled) return;
    this.handleDragOut(event);
    const files = Array.from(event.dataTransfer?.files || []);
    this.processFiles(files);
  }

  handleInputFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.processFiles(Array.from(input.files));
    }
  }

  triggerFileInput(): void {
    if (!this.isDisabled && this.fileInputRef?.nativeElement) {
      this.fileInputRef.nativeElement.click();
    }
  }

  onDelete(fileId: string): void {
    this.fileDeleted.emit(fileId);
  }

  onRetry(fileId: string): void {
    this.fileRetry.emit(fileId);
  }

  getFileIcon(file: UploadedFile): string {
    if (file.type?.startsWith('image/')) {
      return 'fa-image';
    } else if (file.type?.startsWith('video/')) {
      return 'fa-video';
    } else if (file.type?.includes('pdf')) {
      return 'fa-file-pdf';
    } else if (file.type?.includes('word') || file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
      return 'fa-file-word';
    } else {
      return 'fa-file';
    }
  }
}

