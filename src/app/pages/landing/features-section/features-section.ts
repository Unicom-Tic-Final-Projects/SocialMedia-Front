import { Component, AfterViewInit, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AosService } from '../../../shared/services/aos.service';
import { ParallaxService } from '../../../shared/services/parallax.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-features-section',
  imports: [CommonModule],
  templateUrl: './features-section.html',
  styleUrl: './features-section.css',
})
export class FeaturesSection implements AfterViewInit, OnInit, OnDestroy {
  @ViewChild('featuresSection', { static: true }) featuresSection!: ElementRef<HTMLElement>;
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
    if (!this.featuresSection || !this.parallaxBg) return;
    const elementOffset = this.parallaxService.getElementOffset(this.featuresSection.nativeElement);
    const bgOffset = this.parallaxService.calculateParallax(this.scrollY, elementOffset, 0.2);
    this.parallaxBg.nativeElement.style.transform = `translateY(${bgOffset}px)`;
  }
}
