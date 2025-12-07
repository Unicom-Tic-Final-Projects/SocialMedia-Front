import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Platform } from '../../../../models/social.models';
import { PlatformSelectionService } from '../../../../services/shared/platform-selection.service';
import { PostDraftService } from '../../../../services/client/post-draft.service';
import { SocialAccountsService } from '../../../../services/client/social-accounts.service';
import { PostEditorWizardService } from '../../../../services/shared/post-editor-wizard.service';

@Component({
  selector: 'app-step2-platform-selection',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './step2-platform-selection.component.html',
  styleUrl: './step2-platform-selection.component.css',
})
export class Step2PlatformSelectionComponent {
  private readonly platformSelectionService = inject(PlatformSelectionService);
  private readonly draftService = inject(PostDraftService);
  private readonly socialAccountsService = inject(SocialAccountsService);
  private readonly wizardService = inject(PostEditorWizardService);

  readonly allPlatforms = this.platformSelectionService.getAllPlatforms();
  readonly connectedAccounts = this.socialAccountsService.accounts;
  readonly step2ValidationError = this.wizardService.step2ValidationError;

  readonly selectedPlatforms = computed(() => {
    const draft = this.draftService.getActiveDraft();
    return draft?.selectedPlatforms || [];
  });

  getAllPlatforms(): Platform[] {
    return this.allPlatforms;
  }

  isPlatformSelected(platform: Platform): boolean {
    return this.selectedPlatforms().includes(platform);
  }

  getConnectedAccountsForPlatform(platform: Platform) {
    return this.platformSelectionService.getConnectedAccountsForPlatform(
      platform,
      this.connectedAccounts(),
    );
  }

  togglePlatform(platform: Platform): void {
    const current = this.selectedPlatforms();
    const newPlatforms = current.includes(platform)
      ? current.filter((p) => p !== platform)
      : [...current, platform];
    this.draftService.updateSelectedPlatforms(newPlatforms);

    // Clear validation error when a platform is selected
    if (newPlatforms.length > 0) {
      this.wizardService.clearStep2ValidationError();
    }
  }

  getPlatformIcon(platform: Platform): string {
    return this.platformSelectionService.getPlatformIcon(platform);
  }

  getPlatformDisplayName(platform: Platform): string {
    return this.platformSelectionService.getPlatformDisplayName(platform);
  }
}

