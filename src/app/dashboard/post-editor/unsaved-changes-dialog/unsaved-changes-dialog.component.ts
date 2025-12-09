import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-unsaved-changes-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './unsaved-changes-dialog.component.html',
  styleUrl: './unsaved-changes-dialog.component.css',
})
export class UnsavedChangesDialogComponent {
  @Input() isOpen = false;
  @Input() saving = false;
  @Output() saveDraft = new EventEmitter<void>();
  @Output() continueWithoutSaving = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  onSaveDraft(): void {
    this.saveDraft.emit();
  }

  onContinueWithoutSaving(): void {
    this.continueWithoutSaving.emit();
  }

  onCancel(): void {
    this.cancel.emit();
  }

  onBackdropClick(): void {
    // Don't close on backdrop click - force user to make a choice
  }
}

