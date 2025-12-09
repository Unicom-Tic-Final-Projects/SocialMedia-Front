import { Component, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AosService } from '../../../shared/services/aos.service';

@Component({
  selector: 'app-case-studies-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './case-studies-section.html',
  styleUrl: './case-studies-section.css',
})
export class CaseStudiesSection implements AfterViewInit {
  private aosService = inject(AosService);

  ngAfterViewInit() {
    setTimeout(() => {
      this.aosService.refreshAos();
    }, 100);
  }
}

