import { Component, Input, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

@Component({
  selector: 'app-scroll-reveal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './scroll-reveal.component.html',
  styleUrl: './scroll-reveal.component.css',
})
export class ScrollRevealComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() enableBlur: boolean = true;
  @Input() baseOpacity: number = 0.1;
  @Input() baseRotation: number = 3;
  @Input() blurStrength: number = 4;
  @Input() containerClassName: string = '';
  @Input() textClassName: string = '';
  @Input() rotationEnd: string = 'bottom bottom';
  @Input() wordAnimationEnd: string = 'bottom bottom';
  @Input() scrollContainerRef?: HTMLElement;

  @ViewChild('container', { static: false }) containerRef!: ElementRef<HTMLElement>;
  @ViewChild('textElement', { static: false }) textElementRef!: ElementRef<HTMLElement>;

  splitText: Array<string | { word: string; isSpace: boolean }> = [];
  private scrollTriggers: ScrollTrigger[] = [];

  ngOnInit(): void {
    // This will be set from content projection
  }

  ngAfterViewInit(): void {
    this.initializeScrollReveal();
  }

  ngOnDestroy(): void {
    // Clean up ScrollTrigger instances
    this.scrollTriggers.forEach(trigger => trigger.kill());
    ScrollTrigger.getAll().forEach(trigger => {
      if (trigger.vars.trigger === this.containerRef?.nativeElement) {
        trigger.kill();
      }
    });
  }

  private initializeScrollReveal(): void {
    const el = this.containerRef?.nativeElement;
    const textEl = this.textElementRef?.nativeElement;
    
    if (!el || !textEl) {
      // Retry after a short delay if elements aren't ready
      setTimeout(() => this.initializeScrollReveal(), 100);
      return;
    }

    const scroller = this.scrollContainerRef || window;

    // Wait for content to be projected
    setTimeout(() => {
      // Split text into words
      const text = textEl.textContent || textEl.innerText || '';
      if (!text.trim()) {
        // Retry if no text content yet
        setTimeout(() => this.initializeScrollReveal(), 100);
        return;
      }
      
      const words = text.split(/(\s+)/);
      
      // Create word spans
      textEl.innerHTML = '';
      words.forEach((word, index) => {
        if (word.match(/^\s+$/)) {
          // Preserve spaces
          textEl.appendChild(document.createTextNode(word));
        } else {
          const span = document.createElement('span');
          span.className = 'inline-block word';
          span.textContent = word;
          textEl.appendChild(span);
        }
      });

      this.setupAnimations(el, scroller);
    }, 50);
  }

  private setupAnimations(el: HTMLElement, scroller: any): void {

    // Rotation animation
    const rotationTrigger = ScrollTrigger.create({
      trigger: el,
      scroller: scroller as any,
      start: 'top bottom',
      end: this.rotationEnd,
      scrub: true,
      animation: gsap.fromTo(
        el,
        { transformOrigin: '0% 50%', rotate: this.baseRotation },
        { ease: 'none', rotate: 0 }
      ),
    });
    this.scrollTriggers.push(rotationTrigger);

    // Word opacity and blur animation
    const wordElements = el.querySelectorAll<HTMLElement>('.word');
    
    if (wordElements.length > 0) {
      // Opacity animation
      const opacityTrigger = ScrollTrigger.create({
        trigger: el,
        scroller: scroller as any,
        start: 'top bottom-=20%',
        end: this.wordAnimationEnd,
        scrub: true,
        animation: gsap.fromTo(
          wordElements,
          { opacity: this.baseOpacity, willChange: 'opacity' },
          {
            ease: 'none',
            opacity: 1,
            stagger: 0.05,
          }
        ),
      });
      this.scrollTriggers.push(opacityTrigger);

      // Blur animation
      if (this.enableBlur) {
        const blurTrigger = ScrollTrigger.create({
          trigger: el,
          scroller: scroller as any,
          start: 'top bottom-=20%',
          end: this.wordAnimationEnd,
          scrub: true,
          animation: gsap.fromTo(
            wordElements,
            { filter: `blur(${this.blurStrength}px)` },
            {
              ease: 'none',
              filter: 'blur(0px)',
              stagger: 0.05,
            }
          ),
        });
        this.scrollTriggers.push(blurTrigger);
      }
    }
  }
}

