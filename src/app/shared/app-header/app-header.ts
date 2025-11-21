import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { StaggeredMenuComponent, StaggeredMenuItem, StaggeredMenuSocialItem } from '../staggered-menu/staggered-menu.component';
import { GooeyNavComponent, GooeyNavItem } from '../gooey-nav/gooey-nav.component';

@Component({
  selector: 'app-app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, StaggeredMenuComponent, GooeyNavComponent],
  templateUrl: './app-header.html',
  styleUrl: './app-header.css',
})
export class AppHeader {
  @ViewChild(GooeyNavComponent) gooeyNav?: GooeyNavComponent;
  
  menuOpen = false;

  menuItems: StaggeredMenuItem[] = [
    { label: 'Home', ariaLabel: 'Go to home page', link: '#hero' },
    { label: 'Features', ariaLabel: 'View our features', link: '#features' },
    { label: 'Testimonials', ariaLabel: 'Read testimonials', link: '#testimonials' },
    { label: 'Pricing', ariaLabel: 'View pricing plans', link: '#pricing' },
    { label: 'Login', ariaLabel: 'Login to your account', link: '/auth/login' },
    { label: 'Sign Up', ariaLabel: 'Create a new account', link: '/auth/register' }
  ];

  socialItems: StaggeredMenuSocialItem[] = [
    { label: 'Facebook', link: 'https://facebook.com' },
    { label: 'Twitter', link: 'https://twitter.com' },
    { label: 'LinkedIn', link: 'https://linkedin.com' },
    { label: 'Instagram', link: 'https://instagram.com' }
  ];

  gooeyNavItems: GooeyNavItem[] = [
    { label: 'Home', href: '#hero' },
    { label: 'Features', href: '#features' },
    { label: 'Testimonials', href: '#testimonials' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Login', href: '/auth/login' },
    { label: 'Sign Up', href: '/auth/register' }
  ];

  // Method to update active nav item from parent
  updateActiveNavItem(index: number): void {
    if (this.gooeyNav) {
      this.gooeyNav.setActiveIndex(index, true);
    }
  }

  constructor(private readonly router: Router) {}

  onMenuOpen(): void {
    this.menuOpen = true;
  }

  onMenuClose(): void {
    this.menuOpen = false;
  }

  scrollToSection(sectionId: string, event?: Event): void {
    event?.preventDefault();
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      this.router.navigateByUrl('/').then(() => {
        setTimeout(() => {
          const target = document.getElementById(sectionId);
          target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      });
    }
  }
}

