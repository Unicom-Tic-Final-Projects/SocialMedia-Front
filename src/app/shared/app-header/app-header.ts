import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-app-header',
  imports: [CommonModule, RouterModule],
  templateUrl: './app-header.html',
  styleUrl: './app-header.css',
})
export class AppHeader {

  menuOpen = false;

  constructor(private readonly router: Router) {}

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
  }

  scrollToSection(sectionId: string, event?: Event): void {
    event?.preventDefault();
    this.menuOpen = false;
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      // fall back to home route then scroll after navigation
      this.router.navigateByUrl('/').then(() => {
        setTimeout(() => {
          const target = document.getElementById(sectionId);
          target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      });
    }
  }
}

