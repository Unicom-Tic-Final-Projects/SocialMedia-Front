import { Component, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { AosService } from '../../../shared/services/aos.service';
import { ModelViewerComponent } from './model-viewer.component';

@Component({
  selector: 'app-hero-section',
	imports: [ModelViewerComponent],
  templateUrl: './hero-section.html',
  styleUrl: './hero-section.css',
})
export class HeroSection implements AfterViewInit {
  constructor(private aosService: AosService, private readonly router: Router) {}

  ngAfterViewInit() {
    setTimeout(() => {
      this.aosService.refreshAos();
    }, 50);
  }

  navigateTo(path: string): void {
    this.router.navigateByUrl(path);
  }
}
