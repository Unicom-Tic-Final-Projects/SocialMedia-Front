import { Component, AfterViewInit, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AosService } from '../../../shared/services/aos.service';
import { ParallaxService } from '../../../shared/services/parallax.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-cta-band',
  imports: [CommonModule],
  templateUrl: './cta-band.html',
  styleUrl: './cta-band.css',
})
export class CtaBand implements AfterViewInit, OnInit, OnDestroy {
  @ViewChild('ctaSection', { static: true }) ctaSection!: ElementRef<HTMLElement>;
  @ViewChild('parallaxBg', { static: true }) parallaxBg!: ElementRef<HTMLElement>;
  
  scrollY = 0;
  private subscriptions = new Subscription();

  constructor(
    private aosService: AosService,
    private readonly router: Router,
    private parallaxService: ParallaxService
  ) {}

  ngOnInit() {
    this.subscriptions.add(
      this.parallaxService.scroll$.subscribe(scrollY => {
        this.scrollY = scrollY;
        this.updateParallax();
      })
    );
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.aosService.refreshAos();
    }, 50);
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  private updateParallax() {
    if (!this.ctaSection || !this.parallaxBg) return;
    const elementOffset = this.parallaxService.getElementOffset(this.ctaSection.nativeElement);
    const bgOffset = this.parallaxService.calculateParallax(this.scrollY, elementOffset, 0.3);
    this.parallaxBg.nativeElement.style.transform = `translateY(${bgOffset}px)`;
  }

  navigateTo(path: string): void {
    this.router.navigateByUrl(path);
  }
}
