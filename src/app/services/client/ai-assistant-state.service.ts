import { Injectable, signal } from '@angular/core';
import { GenerateImageResponse, GenerateCaptionResponse, GenerateContentPlanResponse } from './ai.service';

interface EditHistoryItem {
  id: string;
  prompt: string;
  preset?: string;
  imageUrl: string;
  imageBase64?: string;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root',
})
export class AIAssistantStateService {
  // Store generated image
  private _generatedImage = signal<GenerateImageResponse | null>(null);
  readonly generatedImage = this._generatedImage.asReadonly();

  // Store image form prompt
  private _imagePrompt = signal<string>('');
  readonly imagePrompt = this._imagePrompt.asReadonly();

  // Store image form values
  private _imageFormValues = signal<{
    prompt: string;
    style: string;
    aspectRatio: string;
    width: number;
    height: number;
  } | null>(null);
  readonly imageFormValues = this._imageFormValues.asReadonly();

  // Store caption generation state
  private _captionFormValues = signal<{
    topic: string;
    context: string;
    platform: string;
    captionCount: number;
    includeHashtags: boolean;
    hashtagCount: number;
  } | null>(null);
  readonly captionFormValues = this._captionFormValues.asReadonly();

  private _generatedCaptions = signal<GenerateCaptionResponse | null>(null);
  readonly generatedCaptions = this._generatedCaptions.asReadonly();

  // Store content plan state
  private _contentPlanFormValues = signal<{
    topic: string;
    businessContext: string;
    platform: string;
    postsPerWeek: number;
    weeks: number;
  } | null>(null);
  readonly contentPlanFormValues = this._contentPlanFormValues.asReadonly();

  private _generatedContentPlan = signal<GenerateContentPlanResponse | null>(null);
  readonly generatedContentPlan = this._generatedContentPlan.asReadonly();

  // Store image editor state
  private _originalImageUrl = signal<string | null>(null);
  readonly originalImageUrl = this._originalImageUrl.asReadonly();

  private _originalImageBase64 = signal<string | null>(null);
  readonly originalImageBase64 = this._originalImageBase64.asReadonly();

  private _currentImageUrl = signal<string | null>(null);
  readonly currentImageUrl = this._currentImageUrl.asReadonly();

  private _editHistory = signal<EditHistoryItem[]>([]);
  readonly editHistory = this._editHistory.asReadonly();

  private _currentHistoryIndex = signal<number>(-1);
  readonly currentHistoryIndex = this._currentHistoryIndex.asReadonly();

  private _editFormValues = signal<{
    prompt: string;
    preset: string;
  } | null>(null);
  readonly editFormValues = this._editFormValues.asReadonly();

  // Image generation methods
  setGeneratedImage(image: GenerateImageResponse | null): void {
    this._generatedImage.set(image);
  }

  setImagePrompt(prompt: string): void {
    this._imagePrompt.set(prompt);
  }

  setImageFormValues(values: {
    prompt: string;
    style: string;
    aspectRatio: string;
    width: number;
    height: number;
  } | null): void {
    this._imageFormValues.set(values);
  }

  clearImageState(): void {
    this._generatedImage.set(null);
    this._imagePrompt.set('');
    this._imageFormValues.set(null);
  }

  // Caption generation methods
  setCaptionFormValues(values: {
    topic: string;
    context: string;
    platform: string;
    captionCount: number;
    includeHashtags: boolean;
    hashtagCount: number;
  } | null): void {
    this._captionFormValues.set(values);
  }

  setGeneratedCaptions(captions: GenerateCaptionResponse | null): void {
    this._generatedCaptions.set(captions);
  }

  clearCaptionState(): void {
    this._captionFormValues.set(null);
    this._generatedCaptions.set(null);
  }

  // Content plan methods
  setContentPlanFormValues(values: {
    topic: string;
    businessContext: string;
    platform: string;
    postsPerWeek: number;
    weeks: number;
  } | null): void {
    this._contentPlanFormValues.set(values);
  }

  setGeneratedContentPlan(contentPlan: GenerateContentPlanResponse | null): void {
    this._generatedContentPlan.set(contentPlan);
  }

  clearContentPlanState(): void {
    this._contentPlanFormValues.set(null);
    this._generatedContentPlan.set(null);
  }

  // Image editor methods
  setOriginalImage(url: string | null, base64: string | null): void {
    this._originalImageUrl.set(url);
    this._originalImageBase64.set(base64);
  }

  setCurrentImageUrl(url: string | null): void {
    this._currentImageUrl.set(url);
  }

  setEditHistory(history: EditHistoryItem[]): void {
    this._editHistory.set(history);
  }

  setCurrentHistoryIndex(index: number): void {
    this._currentHistoryIndex.set(index);
  }

  setEditFormValues(values: {
    prompt: string;
    preset: string;
  } | null): void {
    this._editFormValues.set(values);
  }

  clearImageEditorState(): void {
    this._originalImageUrl.set(null);
    this._originalImageBase64.set(null);
    this._currentImageUrl.set(null);
    this._editHistory.set([]);
    this._currentHistoryIndex.set(-1);
    this._editFormValues.set(null);
  }

  // Clear all state
  clearAllState(): void {
    this.clearImageState();
    this.clearCaptionState();
    this.clearContentPlanState();
    this.clearImageEditorState();
  }
}

