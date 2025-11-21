import { Component, AfterViewInit, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AosService } from '../../../shared/services/aos.service';
import { ParallaxService } from '../../../shared/services/parallax.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-testimonials-section',
  imports: [CommonModule],
  templateUrl: './testimonials-section.html',
  styleUrl: './testimonials-section.css',
})
export class TestimonialsSection implements AfterViewInit, OnInit, OnDestroy {
  @ViewChild('testimonialsSection', { static: true }) testimonialsSection!: ElementRef<HTMLElement>;
  @ViewChild('parallaxBg', { static: true }) parallaxBg!: ElementRef<HTMLElement>;
  
  scrollY = 0;
  private subscriptions = new Subscription();

  constructor(
    private aosService: AosService,
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
    if (!this.testimonialsSection || !this.parallaxBg) return;
    const elementOffset = this.parallaxService.getElementOffset(this.testimonialsSection.nativeElement);
    const bgOffset = this.parallaxService.calculateParallax(this.scrollY, elementOffset, 0.25);
    this.parallaxBg.nativeElement.style.transform = `translateY(${bgOffset}px)`;
  }
}
