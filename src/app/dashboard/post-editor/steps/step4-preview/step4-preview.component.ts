import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PostPreviewComponent } from '../../../posts-page/post-preview/post-preview.component';
import { PostDraftService } from '../../../../services/client/post-draft.service';

@Component({
  selector: 'app-step4-preview',
  standalone: true,
  imports: [CommonModule, PostPreviewComponent],
  templateUrl: './step4-preview.component.html',
  styleUrl: './step4-preview.component.css',
})
export class Step4PreviewComponent {
  private readonly draftService = inject(PostDraftService);

  // Use the activeDraft signal directly instead of calling getActiveDraft
  readonly draft = this.draftService.activeDraft;
}

