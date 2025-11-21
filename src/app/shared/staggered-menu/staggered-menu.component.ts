import { Component, Input, Output, EventEmitter, AfterViewInit, OnDestroy, ElementRef, ViewChild, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { gsap } from 'gsap';

export interface StaggeredMenuItem {
  label: string;
  ariaLabel: string;
  link: string;
}

export interface StaggeredMenuSocialItem {
  label: string;
  link: string;
}

@Component({
  selector: 'app-staggered-menu',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './staggered-menu.component.html',
  styleUrl: './staggered-menu.component.css',
})
export class StaggeredMenuComponent implements AfterViewInit, OnDestroy {
  @Input() position: 'left' | 'right' = 'right';
  @Input() colors: string[] = ['#BFC9FF', '#4C6FFF'];
  @Input() items: StaggeredMenuItem[] = [];
  @Input() socialItems: StaggeredMenuSocialItem[] = [];
  @Input() displaySocials: boolean = true;
  @Input() displayItemNumbering: boolean = true;
  @Input() logoUrl: string = '';
  @Input() menuButtonColor: string = '#fff';
  @Input() openMenuButtonColor: string = '#fff';
  @Input() accentColor: string = '#4C6FFF';
  @Input() isFixed: boolean = false;
  @Input() changeMenuColorOnOpen: boolean = true;
  @Output() menuOpen = new EventEmitter<void>();
  @Output() menuClose = new EventEmitter<void>();

  @ViewChild('panelRef', { static: false }) panelRef!: ElementRef<HTMLDivElement>;
  @ViewChild('preLayersRef', { static: false }) preLayersRef!: ElementRef<HTMLDivElement>;
  @ViewChild('plusHRef', { static: false }) plusHRef!: ElementRef<HTMLSpanElement>;
  @ViewChild('plusVRef', { static: false }) plusVRef!: ElementRef<HTMLSpanElement>;
  @ViewChild('iconRef', { static: false }) iconRef!: ElementRef<HTMLSpanElement>;
  @ViewChild('textInnerRef', { static: false }) textInnerRef!: ElementRef<HTMLSpanElement>;
  @ViewChild('toggleBtnRef', { static: false }) toggleBtnRef!: ElementRef<HTMLButtonElement>;

  open = false;
  private openRef = false;
  private preLayerEls: HTMLElement[] = [];
  private openTl: gsap.core.Timeline | null = null;
  private closeTween: gsap.core.Tween | null = null;
  private spinTween: gsap.core.Timeline | null = null;
  private textCycleAnim: gsap.core.Tween | null = null;
  private colorTween: gsap.core.Tween | null = null;
  private busy = false;
  textLines: string[] = ['Menu', 'Close'];

  constructor(
    private ngZone: NgZone,
    private router: Router
  ) {}

  getPreLayerColors(): string[] {
    const raw = this.colors && this.colors.length ? this.colors.slice(0, 4) : ['#1e1e22', '#35353c'];
    let arr = [...raw];
    if (arr.length >= 3) {
      const mid = Math.floor(arr.length / 2);
      arr.splice(mid, 1);
    }
    return arr;
  }

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      this.initializeMenu();
    });
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  private initializeMenu(): void {
    const panel = this.panelRef?.nativeElement;
    const preContainer = this.preLayersRef?.nativeElement;
    const plusH = this.plusHRef?.nativeElement;
    const plusV = this.plusVRef?.nativeElement;
    const icon = this.iconRef?.nativeElement;
    const textInner = this.textInnerRef?.nativeElement;

    if (!panel || !plusH || !plusV || !icon || !textInner) return;

    let preLayers: HTMLElement[] = [];
    if (preContainer) {
      preLayers = Array.from(preContainer.querySelectorAll('.sm-prelayer')) as HTMLElement[];
    }
    this.preLayerEls = preLayers;

    const offscreen = this.position === 'left' ? -100 : 100;
    gsap.set([panel, ...preLayers], { xPercent: offscreen });

    gsap.set(plusH, { transformOrigin: '50% 50%', rotate: 0 });
    gsap.set(plusV, { transformOrigin: '50% 50%', rotate: 90 });
    gsap.set(icon, { rotate: 0, transformOrigin: '50% 50%' });
    gsap.set(textInner, { yPercent: 0 });

    // Initial color is handled by CSS classes
    // No need to set via GSAP
  }

  private buildOpenTimeline(): gsap.core.Timeline | null {
    const panel = this.panelRef?.nativeElement;
    const layers = this.preLayerEls;
    if (!panel) return null;

    this.openTl?.kill();
    if (this.closeTween) {
      this.closeTween.kill();
      this.closeTween = null;
    }

    const itemEls = Array.from(panel.querySelectorAll('.sm-panel-itemLabel')) as HTMLElement[];
    const numberEls = Array.from(
      panel.querySelectorAll('.sm-panel-list[data-numbering] .sm-panel-item')
    ) as HTMLElement[];
    const socialTitle = panel.querySelector('.sm-socials-title') as HTMLElement | null;
    const socialLinks = Array.from(panel.querySelectorAll('.sm-socials-link')) as HTMLElement[];

    const layerStates = layers.map(el => ({ el, start: Number(gsap.getProperty(el, 'xPercent')) }));
    const panelStart = Number(gsap.getProperty(panel, 'xPercent'));

    if (itemEls.length) gsap.set(itemEls, { yPercent: 140, rotate: 10 });
    if (numberEls.length) gsap.set(numberEls, { ['--sm-num-opacity' as any]: 0 });
    if (socialTitle) gsap.set(socialTitle, { opacity: 0 });
    if (socialLinks.length) gsap.set(socialLinks, { y: 25, opacity: 0 });

    const tl = gsap.timeline({ paused: true });

    layerStates.forEach((ls, i) => {
      tl.fromTo(
        ls.el,
        { xPercent: ls.start },
        { xPercent: 0, duration: 0.5, ease: 'power4.out' },
        i * 0.07
      );
    });

    const lastTime = layerStates.length ? (layerStates.length - 1) * 0.07 : 0;
    const panelInsertTime = lastTime + (layerStates.length ? 0.08 : 0);
    const panelDuration = 0.65;

    tl.fromTo(
      panel,
      { xPercent: panelStart },
      { xPercent: 0, duration: panelDuration, ease: 'power4.out' },
      panelInsertTime
    );

    if (itemEls.length) {
      const itemsStartRatio = 0.15;
      const itemsStart = panelInsertTime + panelDuration * itemsStartRatio;

      tl.to(
        itemEls,
        {
          yPercent: 0,
          rotate: 0,
          duration: 1,
          ease: 'power4.out',
          stagger: { each: 0.1, from: 'start' }
        },
        itemsStart
      );

      if (numberEls.length) {
        tl.to(
          numberEls,
          {
            duration: 0.6,
            ease: 'power2.out',
            ['--sm-num-opacity' as any]: 1,
            stagger: { each: 0.08, from: 'start' }
          },
          itemsStart + 0.1
        );
      }
    }

    if (socialTitle || socialLinks.length) {
      const socialsStart = panelInsertTime + panelDuration * 0.4;

      if (socialTitle) {
        tl.to(socialTitle, { opacity: 1, duration: 0.5, ease: 'power2.out' }, socialsStart);
      }
      if (socialLinks.length) {
        tl.to(
          socialLinks,
          {
            y: 0,
            opacity: 1,
            duration: 0.55,
            ease: 'power3.out',
            stagger: { each: 0.08, from: 'start' },
            onComplete: () => {
              gsap.set(socialLinks, { clearProps: 'opacity' });
            }
          },
          socialsStart + 0.04
        );
      }
    }

    this.openTl = tl;
    return tl;
  }

  private playOpen(): void {
    if (this.busy) return;
    this.busy = true;
    const tl = this.buildOpenTimeline();
    if (tl) {
      tl.eventCallback('onComplete', () => {
        this.busy = false;
      });
      tl.play(0);
    } else {
      this.busy = false;
    }
  }

  private playClose(): void {
    this.openTl?.kill();
    this.openTl = null;

    const panel = this.panelRef?.nativeElement;
    const layers = this.preLayerEls;
    if (!panel) return;

    const all: HTMLElement[] = [...layers, panel];
    this.closeTween?.kill();

    const offscreen = this.position === 'left' ? -100 : 100;

    this.closeTween = gsap.to(all, {
      xPercent: offscreen,
      duration: 0.32,
      ease: 'power3.in',
      overwrite: 'auto',
      onComplete: () => {
        const itemEls = Array.from(panel.querySelectorAll('.sm-panel-itemLabel')) as HTMLElement[];
        if (itemEls.length) gsap.set(itemEls, { yPercent: 140, rotate: 10 });

        const numberEls = Array.from(
          panel.querySelectorAll('.sm-panel-list[data-numbering] .sm-panel-item')
        ) as HTMLElement[];
        if (numberEls.length) gsap.set(numberEls, { ['--sm-num-opacity' as any]: 0 });

        const socialTitle = panel.querySelector('.sm-socials-title') as HTMLElement | null;
        const socialLinks = Array.from(panel.querySelectorAll('.sm-socials-link')) as HTMLElement[];
        if (socialTitle) gsap.set(socialTitle, { opacity: 0 });
        if (socialLinks.length) gsap.set(socialLinks, { y: 25, opacity: 0 });

        this.busy = false;
      }
    });
  }

  private animateIcon(opening: boolean): void {
    const icon = this.iconRef?.nativeElement;
    const h = this.plusHRef?.nativeElement;
    const v = this.plusVRef?.nativeElement;
    if (!icon || !h || !v) return;

    this.spinTween?.kill();

    if (opening) {
      gsap.set(icon, { rotate: 0, transformOrigin: '50% 50%' });
      this.spinTween = gsap
        .timeline({ defaults: { ease: 'power4.out' } })
        .to(h, { rotate: 45, duration: 0.5 }, 0)
        .to(v, { rotate: -45, duration: 0.5 }, 0);
    } else {
      this.spinTween = gsap
        .timeline({ defaults: { ease: 'power3.inOut' } })
        .to(h, { rotate: 0, duration: 0.35 }, 0)
        .to(v, { rotate: 90, duration: 0.35 }, 0)
        .to(icon, { rotate: 0, duration: 0.001 }, 0);
    }
  }

  private animateColor(opening: boolean): void {
    const btn = this.toggleBtnRef?.nativeElement;
    if (!btn) return;
    this.colorTween?.kill();
    
    // Use CSS classes for color transitions instead of GSAP
    // The classes handle the color change automatically
    if (this.changeMenuColorOnOpen) {
      // Color change is handled by CSS classes in the template
      // No GSAP animation needed for color
    } else {
      // If not changing color on open, ensure brand color is set
      gsap.set(btn, { color: '#4C6FFF' });
    }
  }

  private animateText(opening: boolean): void {
    const inner = this.textInnerRef?.nativeElement;
    if (!inner) return;

    this.textCycleAnim?.kill();

    const currentLabel = opening ? 'Menu' : 'Close';
    const targetLabel = opening ? 'Close' : 'Menu';
    const cycles = 3;

    const seq: string[] = [currentLabel];
    let last = currentLabel;
    for (let i = 0; i < cycles; i++) {
      last = last === 'Menu' ? 'Close' : 'Menu';
      seq.push(last);
    }
    if (last !== targetLabel) seq.push(targetLabel);
    seq.push(targetLabel);

    this.textLines = seq;
    gsap.set(inner, { yPercent: 0 });

    const lineCount = seq.length;
    const finalShift = ((lineCount - 1) / lineCount) * 100;

    this.textCycleAnim = gsap.to(inner, {
      yPercent: -finalShift,
      duration: 0.5 + lineCount * 0.07,
      ease: 'power4.out'
    });
  }

  toggleMenu(): void {
    const target = !this.openRef;
    this.openRef = target;
    this.open = target;

    if (target) {
      this.menuOpen.emit();
      this.playOpen();
    } else {
      this.menuClose.emit();
      this.playClose();
    }

    this.animateIcon(target);
    this.animateColor(target);
    this.animateText(target);
  }

  handleItemClick(item: StaggeredMenuItem, event: Event): void {
    event.preventDefault();
    this.toggleMenu();
    
    if (item.link.startsWith('#')) {
      // Scroll to section
      const sectionId = item.link.substring(1);
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 500);
    } else {
      // Navigate to route
      this.router.navigateByUrl(item.link);
    }
  }

  private cleanup(): void {
    this.openTl?.kill();
    this.closeTween?.kill();
    this.spinTween?.kill();
    this.textCycleAnim?.kill();
    this.colorTween?.kill();
  }
}

