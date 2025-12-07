import { Component, AfterViewInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AosService } from '../../../shared/services/aos.service';
import { ModelViewerComponent } from '../hero-section/model-viewer.component';

@Component({
  selector: 'app-interactive-showcase',
  imports: [ModelViewerComponent],
  templateUrl: './interactive-showcase.html',
  styleUrl: './interactive-showcase.css',
})
export class InteractiveShowcase implements AfterViewInit {
  private aosService = inject(AosService);
  private readonly router = inject(Router);

  ngAfterViewInit() {
    setTimeout(() => {
      this.aosService.refreshAos();
    }, 50);
  }

  navigateTo(path: string): void {
    this.router.navigateByUrl(path);
  }
}
