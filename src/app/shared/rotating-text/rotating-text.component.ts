import { Component, Input, OnInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface RotatingTextRef {
  next: () => void;
  previous: () => void;
  jumpTo: (index: number) => void;
  reset: () => void;
}

@Component({
  selector: 'app-rotating-text',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rotating-text.component.html',
  styleUrl: './rotating-text.component.css'
})
export class RotatingTextComponent implements OnInit, OnDestroy {
  @Input() texts: string[] = [];
  @Input() rotationInterval: number = 2000;
  @Input() staggerDuration: number = 0.025;
  @Input() staggerFrom: 'first' | 'last' | 'center' | 'random' | number = 'first';
  @Input() loop: boolean = true;
  @Input() auto: boolean = true;
  @Input() splitBy: 'characters' | 'words' | 'lines' = 'characters';
  @Input() mainClassName: string = '';
  @Input() splitLevelClassName: string = '';
  @Input() elementLevelClassName: string = '';

  currentTextIndex: number = 0;
  currentText: string = '';
  elements: Array<{ characters: string[]; needsSpace: boolean }> = [];
  private intervalId: any;
  animationKey: number = 0; // Force re-render on text change

  constructor(private ngZone: NgZone) {}

  ngOnInit(): void {
    if (this.texts.length > 0) {
      this.currentText = this.texts[0];
      this.updateElements();
      
      // Force initial animation
      setTimeout(() => {
        this.animationKey++;
        this.updateElements();
      }, 100);
      
      if (this.auto && this.texts.length > 1) {
        this.startAutoRotation();
      }
    }
  }

  ngOnDestroy(): void {
    this.stopAutoRotation();
  }

  private updateElements(): void {
    const currentText = this.texts[this.currentTextIndex];
    if (!currentText) return;

    // Create new array reference to force Angular change detection
    const newElements: Array<{ characters: string[]; needsSpace: boolean }> = [];

    if (this.splitBy === 'characters') {
      const words = currentText.split(' ');
      words.forEach((word, i) => {
        newElements.push({
          characters: this.splitIntoCharacters(word),
          needsSpace: i !== words.length - 1
        });
      });
    } else if (this.splitBy === 'words') {
      const words = currentText.split(' ');
      words.forEach((word, i, arr) => {
        newElements.push({
          characters: [word],
          needsSpace: i !== arr.length - 1
        });
      });
    } else if (this.splitBy === 'lines') {
      const lines = currentText.split('\n');
      lines.forEach((line, i, arr) => {
        newElements.push({
          characters: [line],
          needsSpace: i !== arr.length - 1
        });
      });
    } else {
      const parts = currentText.split(this.splitBy);
      parts.forEach((part, i, arr) => {
        newElements.push({
          characters: [part],
          needsSpace: i !== arr.length - 1
        });
      });
    }

    this.elements = newElements;
  }

  private splitIntoCharacters(text: string): string[] {
    if (typeof Intl !== 'undefined' && (Intl as any).Segmenter) {
      const segmenter = new (Intl as any).Segmenter('en', { granularity: 'grapheme' });
      return Array.from(segmenter.segment(text), (segment: any) => segment.segment);
    }
    return Array.from(text);
  }

  private getStaggerDelay(index: number, totalChars: number): number {
    const total = totalChars;
    if (this.staggerFrom === 'first') return index * this.staggerDuration;
    if (this.staggerFrom === 'last') return (total - 1 - index) * this.staggerDuration;
    if (this.staggerFrom === 'center') {
      const center = Math.floor(total / 2);
      return Math.abs(center - index) * this.staggerDuration;
    }
    if (this.staggerFrom === 'random') {
      const randomIndex = Math.floor(Math.random() * total);
      return Math.abs(randomIndex - index) * this.staggerDuration;
    }
    return Math.abs((this.staggerFrom as number) - index) * this.staggerDuration;
  }

  private startAutoRotation(): void {
    this.ngZone.runOutsideAngular(() => {
      this.intervalId = setInterval(() => {
        this.ngZone.run(() => {
          this.next();
        });
      }, this.rotationInterval);
    });
  }

  private stopAutoRotation(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  next(): void {
    const nextIndex = this.currentTextIndex === this.texts.length - 1 
      ? (this.loop ? 0 : this.currentTextIndex) 
      : this.currentTextIndex + 1;
    
    if (nextIndex !== this.currentTextIndex) {
      // Increment key to force re-render
      this.animationKey++;
      // Clear elements to trigger exit
      this.elements = [];
      
      // Use requestAnimationFrame to ensure smooth transition
      requestAnimationFrame(() => {
        this.currentTextIndex = nextIndex;
        this.currentText = this.texts[this.currentTextIndex];
        this.updateElements();
      });
    }
  }

  previous(): void {
    const prevIndex = this.currentTextIndex === 0 
      ? (this.loop ? this.texts.length - 1 : this.currentTextIndex) 
      : this.currentTextIndex - 1;
    
    if (prevIndex !== this.currentTextIndex) {
      this.currentTextIndex = prevIndex;
      this.currentText = this.texts[this.currentTextIndex];
      this.updateElements();
    }
  }

  jumpTo(index: number): void {
    const validIndex = Math.max(0, Math.min(index, this.texts.length - 1));
    if (validIndex !== this.currentTextIndex) {
      this.currentTextIndex = validIndex;
      this.currentText = this.texts[this.currentTextIndex];
      this.updateElements();
    }
  }

  reset(): void {
    if (this.currentTextIndex !== 0) {
      this.currentTextIndex = 0;
      this.currentText = this.texts[0];
      this.updateElements();
    }
  }

  getTotalCharacters(): number {
    return this.elements.reduce((sum, word) => sum + word.characters.length, 0);
  }

  getCharDelay(wordIndex: number, charIndex: number): number {
    const previousCharsCount = this.elements
      .slice(0, wordIndex)
      .reduce((sum, word) => sum + word.characters.length, 0);
    return this.getStaggerDelay(previousCharsCount + charIndex, this.getTotalCharacters());
  }

  getCharIndex(wordIndex: number, charIndex: number): number {
    const previousCharsCount = this.elements
      .slice(0, wordIndex)
      .reduce((sum, word) => sum + word.characters.length, 0);
    return previousCharsCount + charIndex;
  }

  trackByWord(index: number, word: { characters: string[]; needsSpace: boolean }): string {
    return `${this.animationKey}-${this.currentTextIndex}-${index}-${word.characters.join('')}`;
  }

  trackByChar(index: number, char: string): string {
    return `${this.animationKey}-${this.currentTextIndex}-${index}-${char}`;
  }
}

