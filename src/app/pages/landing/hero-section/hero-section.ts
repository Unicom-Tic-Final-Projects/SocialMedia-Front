import { Component, AfterViewInit, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AosService } from '../../../shared/services/aos.service';
import { ParallaxService } from '../../../shared/services/parallax.service';
import { ClickSparkComponent } from '../../../shared/click-spark/click-spark.component';
import { RotatingTextComponent } from '../../../shared/rotating-text/rotating-text.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-hero-section',
  imports: [CommonModule, ClickSparkComponent, RotatingTextComponent],
  templateUrl: './hero-section.html',
  styleUrl: './hero-section.css',
})
export class HeroSection implements AfterViewInit, OnInit, OnDestroy {
  @ViewChild('heroSection', { static: true }) heroSection!: ElementRef<HTMLElement>;
  @ViewChild('parallaxBg', { static: true }) parallaxBg!: ElementRef<HTMLElement>;
  @ViewChild('parallaxContent', { static: true }) parallaxContent!: ElementRef<HTMLElement>;

  scrollY = 0;
  private subscriptions = new Subscription();

  constructor(
    private aosService: AosService,
    private readonly router: Router,
    private parallaxService: ParallaxService
  ) { }

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
    if (!this.heroSection || !this.parallaxBg || !this.parallaxContent) return;

    const elementOffset = this.parallaxService.getElementOffset(this.heroSection.nativeElement);
    const bgOffset = this.parallaxService.calculateParallax(this.scrollY, elementOffset, 0.3);
    const contentOffset = this.parallaxService.calculateParallax(this.scrollY, elementOffset, 0.1);

    this.parallaxBg.nativeElement.style.transform = `translateY(${bgOffset}px)`;
    this.parallaxContent.nativeElement.style.transform = `translateY(${contentOffset}px)`;
  }


  navigateTo(path: string): void {
    this.router.navigateByUrl(path);
  }
}
