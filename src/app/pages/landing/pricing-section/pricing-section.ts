import { Component, AfterViewInit, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AosService } from '../../../shared/services/aos.service';
import { ParallaxService } from '../../../shared/services/parallax.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-pricing-section',
  imports: [CommonModule],
  templateUrl: './pricing-section.html',
  styleUrl: './pricing-section.css',
})
export class PricingSection implements AfterViewInit, OnInit, OnDestroy {
  @ViewChild('pricingSection', { static: true }) pricingSection!: ElementRef<HTMLElement>;
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
    if (!this.pricingSection || !this.parallaxBg) return;
    const elementOffset = this.parallaxService.getElementOffset(this.pricingSection.nativeElement);
    const bgOffset = this.parallaxService.calculateParallax(this.scrollY, elementOffset, 0.2);
    this.parallaxBg.nativeElement.style.transform = `translateY(${bgOffset}px)`;
  }
}
