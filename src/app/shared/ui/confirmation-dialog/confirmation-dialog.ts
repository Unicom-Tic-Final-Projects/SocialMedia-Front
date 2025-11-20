import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmationService } from '../../../core/services/confirmation.service';

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirmation-dialog.html',
  styleUrl: './confirmation-dialog.css',
})
export class ConfirmationDialogComponent {
  private readonly confirmationService = inject(ConfirmationService);
  
  confirmation = this.confirmationService.getConfirmation();

  confirm(): void {
    this.confirmationService.handleResult(true);
  }

  cancel(): void {
    this.confirmationService.handleResult(false);
  }
}

