import { Component, AfterViewInit } from '@angular/core';
import { AosService } from '../../../shared/services/aos.service';

@Component({
  selector: 'app-pricing-section',
  imports: [],
  templateUrl: './pricing-section.html',
  styleUrl: './pricing-section.css',
})
export class PricingSection implements AfterViewInit {
  constructor(private aosService: AosService) {}

  ngAfterViewInit() {
    setTimeout(() => {
      this.aosService.refreshAos();
    }, 50);
  }
}
