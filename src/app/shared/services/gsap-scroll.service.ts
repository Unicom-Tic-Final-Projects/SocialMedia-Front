import { Injectable, OnDestroy } from '@angular/core';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

@Injectable({
  providedIn: 'root',
})
export class GsapScrollService implements OnDestroy {
  private scrollTriggers: ScrollTrigger[] = [];

  constructor() {
    // Register ScrollTrigger plugin
    if (typeof gsap !== 'undefined') {
      gsap.registerPlugin(ScrollTrigger);
    }
  }

  /**
   * Initialize scroll-triggered animations for elements
   */
  initScrollAnimations(): void {
    // Fade in from bottom animation
    gsap.utils.toArray<HTMLElement>('[data-gsap-fade]').forEach((element) => {
      const trigger = ScrollTrigger.create({
        trigger: element,
        start: 'top 80%',
        end: 'top 20%',
        animation: gsap.fromTo(
          element,
          {
            opacity: 0,
            y: 50,
          },
          {
            opacity: 1,
            y: 0,
            duration: 1,
            ease: 'power3.out',
          }
        ),
        toggleActions: 'play none none reverse',
      });
      this.scrollTriggers.push(trigger);
    });

    // Scale in animation
    gsap.utils.toArray<HTMLElement>('[data-gsap-scale]').forEach((element) => {
      const trigger = ScrollTrigger.create({
        trigger: element,
        start: 'top 80%',
        animation: gsap.fromTo(
          element,
          {
            opacity: 0,
            scale: 0.8,
          },
          {
            opacity: 1,
            scale: 1,
            duration: 0.8,
            ease: 'back.out(1.7)',
          }
        ),
        toggleActions: 'play none none reverse',
      });
      this.scrollTriggers.push(trigger);
    });

    // Slide in from left
    gsap.utils.toArray<HTMLElement>('[data-gsap-slide-left]').forEach((element) => {
      const trigger = ScrollTrigger.create({
        trigger: element,
        start: 'top 80%',
        animation: gsap.fromTo(
          element,
          {
            opacity: 0,
            x: -100,
          },
          {
            opacity: 1,
            x: 0,
            duration: 1,
            ease: 'power3.out',
          }
        ),
        toggleActions: 'play none none reverse',
      });
      this.scrollTriggers.push(trigger);
    });

    // Slide in from right
    gsap.utils.toArray<HTMLElement>('[data-gsap-slide-right]').forEach((element) => {
      const trigger = ScrollTrigger.create({
        trigger: element,
        start: 'top 80%',
        animation: gsap.fromTo(
          element,
          {
            opacity: 0,
            x: 100,
          },
          {
            opacity: 1,
            x: 0,
            duration: 1,
            ease: 'power3.out',
          }
        ),
        toggleActions: 'play none none reverse',
      });
      this.scrollTriggers.push(trigger);
    });

    // Stagger animation for children
    gsap.utils.toArray<HTMLElement>('[data-gsap-stagger]').forEach((container) => {
      const children = container.querySelectorAll('[data-gsap-stagger-item]');
      const trigger = ScrollTrigger.create({
        trigger: container,
        start: 'top 80%',
        animation: gsap.fromTo(
          children,
          {
            opacity: 0,
            y: 30,
          },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            stagger: 0.1,
            ease: 'power2.out',
          }
        ),
        toggleActions: 'play none none reverse',
      });
      this.scrollTriggers.push(trigger);
    });
  }

  /**
   * Refresh all ScrollTrigger instances
   */
  refresh(): void {
    ScrollTrigger.refresh();
  }

  /**
   * Clean up ScrollTrigger instances
   */
  ngOnDestroy(): void {
    this.scrollTriggers.forEach((trigger) => trigger.kill());
    this.scrollTriggers = [];
    ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
  }
}

