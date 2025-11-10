import { Component, AfterViewInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AosService } from '../../../shared/services/aos.service';

@Component({
  selector: 'app-cta-band',
  imports: [RouterLink],
  templateUrl: './cta-band.html',
  styleUrl: './cta-band.css',
})
export class CtaBand implements AfterViewInit {
  constructor(private aosService: AosService) {}

  ngAfterViewInit() {
    setTimeout(() => {
      this.aosService.refreshAos();
    }, 50);
  }
}
