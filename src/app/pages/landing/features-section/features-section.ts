import { Component, AfterViewInit } from '@angular/core';
import { AosService } from '../../../shared/services/aos.service';


@Component({
  selector: 'app-features-section',
  imports: [],
  templateUrl: './features-section.html',
  styleUrl: './features-section.css',
})
export class FeaturesSection implements AfterViewInit {
  constructor(private aosService: AosService) {}

  ngAfterViewInit() {
    setTimeout(() => {
      this.aosService.refreshAos();
    }, 50);
  }
}
