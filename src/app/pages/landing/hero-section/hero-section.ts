import { Component, AfterViewInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AosService } from '../../../shared/services/aos.service';
import { ModelViewerComponent } from './model-viewer.component';

@Component({
  selector: 'app-hero-section',
	imports: [RouterLink, ModelViewerComponent],
  templateUrl: './hero-section.html',
  styleUrl: './hero-section.css',
})
export class HeroSection implements AfterViewInit {
  constructor(private aosService: AosService) {}

  ngAfterViewInit() {
    setTimeout(() => {
      this.aosService.refreshAos();
    }, 50);
  }
}
