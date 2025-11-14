import { Component, AfterViewInit } from '@angular/core';
import { AppHeader } from '../shared/app-header/app-header';
import { HeroSection } from './landing/hero-section/hero-section';
import { FeaturesSection } from './landing/features-section/features-section';
import { TestimonialsSection } from './landing/testimonials-section/testimonials-section';
import { PricingSection } from './landing/pricing-section/pricing-section';
import { CtaBand } from './landing/cta-band/cta-band';
import { WhyOnevo } from './landing/why-onevo/why-onevo'
import { AppFooter } from '../shared/app-footer/app-footer';
import { AosService } from '../shared/services/aos.service';

@Component({
  selector: 'app-landing',
  imports: [AppHeader, HeroSection, FeaturesSection, TestimonialsSection, PricingSection, CtaBand, WhyOnevo, AppFooter],
  templateUrl: './landing.html',
  styleUrl: './landing.css',
})
export class Landing implements AfterViewInit {
  constructor(private aosService: AosService) {}

  ngAfterViewInit() {
    // Refresh AOS when landing page is rendered
    setTimeout(() => {
      this.aosService.refreshAos();
    }, 100);
  }
}
