import { Injectable, inject, signal } from '@angular/core';
import { PostDraftService } from '../client/post-draft.service';
import { PlatformSelectionService } from './platform-selection.service';

export interface StepValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Service for managing post editor wizard state, navigation, and validation
 */
@Injectable({
  providedIn: 'root',
})
export class PostEditorWizardService {
  private readonly draftService = inject(PostDraftService);
  private readonly platformSelectionService = inject(PlatformSelectionService);

  readonly totalSteps = 5;

  private readonly currentStepSignal = signal<number>(1);
  readonly currentStep = this.currentStepSignal.asReadonly();

  // Step completion tracking - checkmarks only show after clicking Next
  private readonly step1CompletedSignal = signal<boolean>(false);
  readonly step1Completed = this.step1CompletedSignal.asReadonly();

  private readonly step2CompletedSignal = signal<boolean>(false);
  readonly step2Completed = this.step2CompletedSignal.asReadonly();

  private readonly step2ValidationErrorSignal = signal<boolean>(false);
  readonly step2ValidationError = this.step2ValidationErrorSignal.asReadonly();

  private readonly step3CompletedSignal = signal<boolean>(false);
  readonly step3Completed = this.step3CompletedSignal.asReadonly();

  private readonly step4PreviewLoadedSignal = signal<boolean>(false);
  readonly step4PreviewLoaded = this.step4PreviewLoadedSignal.asReadonly();

  private readonly step5CompletedSignal = signal<boolean>(false);
  readonly step5Completed = this.step5CompletedSignal.asReadonly();

  /**
   * Initialize wizard state for new post
   */
  initialize(): void {
    this.currentStepSignal.set(1);
    this.step1CompletedSignal.set(false);
    this.step2CompletedSignal.set(false);
    this.step2ValidationErrorSignal.set(false);
    this.step3CompletedSignal.set(false);
    this.step4PreviewLoadedSignal.set(false);
    this.step5CompletedSignal.set(false);
  }

  /**
   * Validate Step 1: Content and Media
   */
  validateStep1(hasContent: boolean, hasMedia: boolean): StepValidationResult {
    if (!hasContent || !hasMedia) {
      return {
        valid: false,
        error: 'Both content and media are required',
      };
    }
    return { valid: true };
  }

  /**
   * Validate Step 2: Platform Selection
   */
  validateStep2(): StepValidationResult {
    const draft = this.draftService.getActiveDraft();
    const selectedPlatforms = draft?.selectedPlatforms || [];
    return this.platformSelectionService.validatePlatformSelection(selectedPlatforms);
  }

  /**
   * Check if can go to next step
   */
  canGoToNextStep(
    step1Valid: boolean,
    step1Completed: boolean,
    step2Completed: boolean,
    step3Completed: boolean,
    step4PreviewLoaded: boolean,
  ): boolean {
    const current = this.currentStepSignal();

    if (current === 1) {
      return step1Valid;
    }
    if (current === 2) {
      if (!step1Completed) {
        return false;
      }
      const validation = this.validateStep2();
      return validation.valid;
    }
    if (current === 3) {
      if (!step2Completed) {
        return false;
      }
      return true; // Step 3 allows proceeding (user can adjust crops)
    }
    if (current === 4) {
      if (!step3Completed) {
        return false;
      }
      return true;
    }
    if (current === 5) {
      if (!step4PreviewLoaded) {
        return false;
      }
      // Verify platforms are selected from draft
      const draft = this.draftService.getActiveDraft();
      const hasPlatforms = (draft?.selectedPlatforms?.length ?? 0) > 0;
      return hasPlatforms;
    }
    return false;
  }

  /**
   * Check if can go to a specific step
   */
  canGoToStep(step: number): boolean {
    const current = this.currentStepSignal();
    // Can go to previous steps
    if (step <= current) {
      return true;
    }
    // Can only go forward if all previous steps are completed
    if (step > current) {
      // Check all previous steps are complete
      for (let i = 1; i < step; i++) {
        if (!this.isStepComplete(i)) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Check if a step is completed
   */
  isStepComplete(step: number): boolean {
    switch (step) {
      case 1:
        return this.step1CompletedSignal();
      case 2:
        return this.step2CompletedSignal();
      case 3:
        return this.step3CompletedSignal();
      case 4:
        return this.step4PreviewLoadedSignal();
      case 5:
        return this.step5CompletedSignal();
      default:
        return false;
    }
  }

  /**
   * Move to next step
   */
  nextStep(
    onStep1Complete?: () => void,
    onStep2Complete?: () => void,
    onStep3Complete?: () => Promise<void>,
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const current = this.currentStepSignal();

      // Step 2: Check validation before proceeding
      if (current === 2) {
        const validation = this.validateStep2();
        if (!validation.valid) {
          this.step2ValidationErrorSignal.set(true);
          resolve(false);
          return;
        } else {
          this.step2ValidationErrorSignal.set(false);
        }
      }

      if (current < this.totalSteps) {
        // Mark current step as completed when moving to next
        if (current === 1) {
          if (onStep1Complete) {
            onStep1Complete();
          }
          this.step1CompletedSignal.set(true);
          this.currentStepSignal.update((step) => step + 1);
          resolve(true);
        } else if (current === 2) {
          this.step2CompletedSignal.set(true);
          this.step2ValidationErrorSignal.set(false);
          if (onStep2Complete) {
            onStep2Complete();
          }
          this.currentStepSignal.update((step) => step + 1);
          resolve(true);
        } else if (current === 3) {
          // Step 3 requires async crop generation
          if (onStep3Complete) {
            onStep3Complete()
              .then(() => {
                this.step3CompletedSignal.set(true);
                this.currentStepSignal.set(4);
                resolve(true);
              })
              .catch((err) => {
                console.error('Error completing step 3:', err);
                // Even on error, try to proceed
                this.step3CompletedSignal.set(true);
                this.currentStepSignal.set(4);
                resolve(true);
              });
          } else {
            this.step3CompletedSignal.set(true);
            this.currentStepSignal.update((step) => step + 1);
            resolve(true);
          }
          return; // Don't continue - async operation
        } else if (current === 4) {
          this.step4PreviewLoadedSignal.set(true);
          this.currentStepSignal.update((step) => step + 1);
          resolve(true);
        } else if (current === 5) {
          // Step 5 completion is handled when publish/schedule is executed
          this.currentStepSignal.update((step) => step + 1);
          resolve(true);
        } else {
          this.currentStepSignal.update((step) => step + 1);
          resolve(true);
        }
      } else {
        resolve(false);
      }
    });
  }

  /**
   * Move to previous step
   */
  previousStep(): void {
    if (this.currentStepSignal() > 1) {
      this.currentStepSignal.update((step) => step - 1);
    }
  }

  /**
   * Go to specific step
   */
  goToStep(step: number): boolean {
    if (this.canGoToStep(step) && step >= 1 && step <= this.totalSteps) {
      this.currentStepSignal.set(step);
      return true;
    }
    return false;
  }

  /**
   * Mark step as completed
   */
  markStepComplete(step: number): void {
    switch (step) {
      case 1:
        this.step1CompletedSignal.set(true);
        break;
      case 2:
        this.step2CompletedSignal.set(true);
        break;
      case 3:
        this.step3CompletedSignal.set(true);
        break;
      case 4:
        this.step4PreviewLoadedSignal.set(true);
        break;
      case 5:
        this.step5CompletedSignal.set(true);
        break;
    }
  }

  /**
   * Clear step 2 validation error
   */
  clearStep2ValidationError(): void {
    this.step2ValidationErrorSignal.set(false);
  }
}

