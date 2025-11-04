import { Component } from '@angular/core';
import { AppHeader } from '../shared/app-header/app-header';
import { HeroSection } from './landing/hero-section/hero-section';
import { FeaturesSection } from './landing/features-section/features-section';
import { IntegrationsSection } from './landing/integrations-section/integrations-section';
import { PricingSection } from './landing/pricing-section/pricing-section';
import { TestimonialsSection } from './landing/testimonials-section/testimonials-section';
import { CtaBand } from './landing/cta-band/cta-band';
import { AppFooter } from '../shared/app-footer/app-footer';

@Component({
  selector: 'app-landing',
  imports: [AppHeader,HeroSection,FeaturesSection,IntegrationsSection,PricingSection,TestimonialsSection,CtaBand,AppFooter],
  templateUrl: './landing.html',
  styleUrl: './landing.css',
})
export class Landing {

}
