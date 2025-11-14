import { Component, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { AosService } from '../../../shared/services/aos.service';

@Component({
  selector: 'app-cta-band',
  templateUrl: './cta-band.html',
  styleUrl: './cta-band.css',
})
export class CtaBand implements AfterViewInit {
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
