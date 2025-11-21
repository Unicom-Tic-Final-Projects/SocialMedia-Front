import { Component, Input, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

export interface GooeyNavItem {
  label: string;
  href: string;
}

@Component({
  selector: 'app-gooey-nav',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './gooey-nav.component.html',
  styleUrl: './gooey-nav.component.css',
})
export class GooeyNavComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() items: GooeyNavItem[] = [];
  @Input() animationTime: number = 600;
  @Input() particleCount: number = 15;
  @Input() particleDistances: [number, number] = [90, 10];
  @Input() particleR: number = 100;
  @Input() timeVariance: number = 300;
  @Input() colors: number[] = [1, 2, 3, 1, 2, 3, 1, 4];
  @Input() initialActiveIndex: number = 0;

  @ViewChild('containerRef', { static: false }) containerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('navRef', { static: false }) navRef!: ElementRef<HTMLUListElement>;
  @ViewChild('filterRef', { static: false }) filterRef!: ElementRef<HTMLSpanElement>;
  @ViewChild('textRef', { static: false }) textRef!: ElementRef<HTMLSpanElement>;

  activeIndex: number = 0;
  private resizeObserver?: ResizeObserver;
  private scrollUpdateTimeout?: number;

  constructor(
    private router: Router,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    this.activeIndex = this.initialActiveIndex;
  }

  ngAfterViewInit() {
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        // Set initial active state
        if (this.navRef?.nativeElement) {
          const activeLi = this.navRef.nativeElement.querySelectorAll('li')[this.activeIndex] as HTMLElement;
          if (activeLi) {
            activeLi.classList.add('active');
          }
        }
        
        this.updateEffectPosition();
        if (this.textRef?.nativeElement) {
          this.textRef.nativeElement.classList.add('active');
        }
        // Trigger particles on initial load for active item
        if (this.filterRef?.nativeElement) {
          this.makeParticles(this.filterRef.nativeElement);
        }
      }, 200);
    });

    if (this.containerRef?.nativeElement) {
      this.resizeObserver = new ResizeObserver(() => {
        this.updateEffectPosition();
      });
      this.resizeObserver.observe(this.containerRef.nativeElement);
    }
  }

  ngOnDestroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  private noise(n: number = 1): number {
    return n / 2 - Math.random() * n;
  }

  private getXY(distance: number, pointIndex: number, totalPoints: number): [number, number] {
    const angle = ((360 + this.noise(8)) / totalPoints) * pointIndex * (Math.PI / 180);
    return [distance * Math.cos(angle), distance * Math.sin(angle)];
  }

  private createParticle(i: number, t: number, d: [number, number], r: number) {
    let rotate = this.noise(r / 10);
    return {
      start: this.getXY(d[0], this.particleCount - i, this.particleCount),
      end: this.getXY(d[1] + this.noise(7), this.particleCount - i, this.particleCount),
      time: t,
      scale: 1 + this.noise(0.2),
      color: this.colors[Math.floor(Math.random() * this.colors.length)],
      rotate: rotate > 0 ? (rotate + r / 20) * 10 : (rotate - r / 20) * 10
    };
  }

  private makeParticles(element: HTMLElement): void {
    const d: [number, number] = this.particleDistances;
    const r = this.particleR;
    const bubbleTime = this.animationTime * 2 + this.timeVariance;
    element.style.setProperty('--time', `${bubbleTime}ms`);
    
    for (let i = 0; i < this.particleCount; i++) {
      const t = this.animationTime * 2 + this.noise(this.timeVariance * 2);
      const p = this.createParticle(i, t, d, r);
      element.classList.remove('active');
      
      setTimeout(() => {
        const particle = document.createElement('span');
        const point = document.createElement('span');
        particle.classList.add('particle');
        particle.style.setProperty('--start-x', `${p.start[0]}px`);
        particle.style.setProperty('--start-y', `${p.start[1]}px`);
        particle.style.setProperty('--end-x', `${p.end[0]}px`);
        particle.style.setProperty('--end-y', `${p.end[1]}px`);
        particle.style.setProperty('--time', `${p.time}ms`);
        particle.style.setProperty('--scale', `${p.scale}`);
        particle.style.setProperty('--color', `var(--color-${p.color}, white)`);
        particle.style.setProperty('--rotate', `${p.rotate}deg`);
        point.classList.add('point');
        particle.appendChild(point);
        element.appendChild(particle);
        
        requestAnimationFrame(() => {
          element.classList.add('active');
        });
        
        setTimeout(() => {
          try {
            element.removeChild(particle);
          } catch {}
        }, t);
      }, 30);
    }
  }

  private updateEffectPosition(): void {
    if (!this.containerRef?.nativeElement || !this.filterRef?.nativeElement || !this.textRef?.nativeElement) return;
    if (!this.navRef?.nativeElement) return;

    const containerRect = this.containerRef.nativeElement.getBoundingClientRect();
    const activeLi = this.navRef.nativeElement.querySelectorAll('li')[this.activeIndex] as HTMLElement;
    
    if (!activeLi) return;

    const pos = activeLi.getBoundingClientRect();
    const styles = {
      left: `${pos.x - containerRect.x}px`,
      top: `${pos.y - containerRect.y}px`,
      width: `${pos.width}px`,
      height: `${pos.height}px`
    };
    
    Object.assign(this.filterRef.nativeElement.style, styles);
    Object.assign(this.textRef.nativeElement.style, styles);
    this.textRef.nativeElement.innerText = activeLi.innerText;
  }

  handleClick(event: Event, index: number): void {
    event.preventDefault();
    const anchorEl = event.currentTarget as HTMLElement; // This is the anchor element, matching React's e.currentTarget
    
    if (this.activeIndex === index) return;
    
    this.activeIndex = index;
    this.updateEffectPositionFromElement(anchorEl);
    
    if (this.filterRef?.nativeElement) {
      const particles = this.filterRef.nativeElement.querySelectorAll('.particle');
      particles.forEach(p => {
        try {
          this.filterRef.nativeElement.removeChild(p);
        } catch {}
      });
    }
    
    if (this.textRef?.nativeElement) {
      this.textRef.nativeElement.classList.remove('active');
      void this.textRef.nativeElement.offsetWidth;
      this.textRef.nativeElement.classList.add('active');
    }
    
    if (this.filterRef?.nativeElement) {
      this.makeParticles(this.filterRef.nativeElement);
    }

    // Handle navigation
    const item = this.items[index];
    if (item.href.startsWith('#')) {
      const sectionId = item.href.substring(1);
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        this.router.navigateByUrl('/').then(() => {
          setTimeout(() => {
            const target = document.getElementById(sectionId);
            target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
        });
      }
    } else if (item.href.startsWith('/')) {
      this.router.navigateByUrl(item.href);
    } else {
      window.open(item.href, '_blank');
    }
  }

  private updateEffectPositionFromElement(element: HTMLElement): void {
    if (!this.containerRef?.nativeElement || !this.filterRef?.nativeElement || !this.textRef?.nativeElement) return;

    const containerRect = this.containerRef.nativeElement.getBoundingClientRect();
    const pos = element.getBoundingClientRect();
    const styles = {
      left: `${pos.x - containerRect.x}px`,
      top: `${pos.y - containerRect.y}px`,
      width: `${pos.width}px`,
      height: `${pos.height}px`
    };
    
    Object.assign(this.filterRef.nativeElement.style, styles);
    Object.assign(this.textRef.nativeElement.style, styles);
    this.textRef.nativeElement.innerText = element.innerText;
  }

  handleKeyDown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const target = event.currentTarget as HTMLElement;
      const liEl = target.parentElement;
      if (liEl) {
        this.handleClick({ currentTarget: liEl } as any, index);
      }
    }
  }

  isRouterLink(href: string): boolean {
    return href.startsWith('/') && !href.startsWith('//') && !href.startsWith('http');
  }

  // Method to update active index programmatically (for scroll detection)
  setActiveIndex(index: number, skipAnimation: boolean = false): void {
    if (this.activeIndex === index) return;
    
    this.activeIndex = index;
    
    // Clear any pending scroll updates
    if (this.scrollUpdateTimeout) {
      clearTimeout(this.scrollUpdateTimeout);
    }
    
    // Update active class on nav items
    if (this.navRef?.nativeElement) {
      const allItems = this.navRef.nativeElement.querySelectorAll('li');
      allItems.forEach((li, i) => {
        if (i === index) {
          li.classList.add('active');
        } else {
          li.classList.remove('active');
        }
      });
    }
    
    // Update effect position
    this.updateEffectPosition();
    
    // Trigger particles if not skipping animation
    if (!skipAnimation && this.filterRef?.nativeElement) {
      const particles = this.filterRef.nativeElement.querySelectorAll('.particle');
      particles.forEach(p => {
        try {
          this.filterRef.nativeElement.removeChild(p);
        } catch {}
      });
      
      if (this.textRef?.nativeElement) {
        this.textRef.nativeElement.classList.remove('active');
        void this.textRef.nativeElement.offsetWidth;
        this.textRef.nativeElement.classList.add('active');
      }
      
      this.makeParticles(this.filterRef.nativeElement);
    }
  }
}

