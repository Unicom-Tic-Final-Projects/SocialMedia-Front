import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { ParallaxService } from '../../../shared/services/parallax.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-why-onevo',
  imports: [CommonModule],
  templateUrl: './why-onevo.html',
  styleUrl: './why-onevo.css',
})
export class WhyOnevo implements OnInit, OnDestroy {
  @ViewChild('whySection', { static: true }) whySection!: ElementRef<HTMLElement>;
  @ViewChild('parallaxBg', { static: true }) parallaxBg!: ElementRef<HTMLElement>;
  
  scrollY = 0;
  private subscriptions = new Subscription();

  constructor(private parallaxService: ParallaxService) {}

  ngOnInit() {
    this.subscriptions.add(
      this.parallaxService.scroll$.subscribe(scrollY => {
        this.scrollY = scrollY;
        this.updateParallax();
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  private updateParallax() {
    if (!this.whySection || !this.parallaxBg) return;
    const elementOffset = this.parallaxService.getElementOffset(this.whySection.nativeElement);
    const bgOffset = this.parallaxService.calculateParallax(this.scrollY, elementOffset, 0.2);
    this.parallaxBg.nativeElement.style.transform = `translateY(${bgOffset}px)`;
  }
}
