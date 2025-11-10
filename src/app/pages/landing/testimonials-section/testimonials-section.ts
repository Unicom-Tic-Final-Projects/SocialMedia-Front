import { Component, AfterViewInit } from '@angular/core';
import { AosService } from '../../../shared/services/aos.service';

@Component({
  selector: 'app-testimonials-section',
  imports: [],
  templateUrl: './testimonials-section.html',
  styleUrl: './testimonials-section.css',
})
export class TestimonialsSection implements AfterViewInit {
  constructor(private aosService: AosService) {}

  ngAfterViewInit() {
    setTimeout(() => {
      this.aosService.refreshAos();
    }, 50);
  }
}
