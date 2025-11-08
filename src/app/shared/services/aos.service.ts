import { Injectable } from '@angular/core';
import * as AOS from 'aos';

@Injectable({
  providedIn: 'root'
})
export class AosService {
  constructor() {
    // AOS is initialized in main.ts, so we just ensure it's available here
  }

  refreshAos(): void {
    // Force AOS to refresh and reflow animations
    // This will re-trigger animations for elements that are in viewport
    if (typeof AOS !== 'undefined') {
      AOS.refreshHard();
    }
  }
}

