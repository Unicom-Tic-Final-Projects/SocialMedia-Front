import { Component, AfterViewInit, ElementRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AosService } from '../../../shared/services/aos.service';

@Component({
  selector: 'app-metrics-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './metrics-section.html',
  styleUrl: './metrics-section.css',
})
export class MetricsSection implements AfterViewInit {
  @ViewChild('metricsSection', { static: false }) metricsSection!: ElementRef<HTMLElement>;
  
  private aosService = inject(AosService);

  ngAfterViewInit() {
    // Initialize counter animations
    this.initializeCounters();
    
    // Refresh AOS for animations
    setTimeout(() => {
      this.aosService.refreshAos();
    }, 100);
  }

  private initializeCounters() {
    const observerOptions = {
      threshold: 0.5,
      rootMargin: '0px',
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          this.animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    // Observe all counter elements
    setTimeout(() => {
      const counters = document.querySelectorAll('.counter-value');
      counters.forEach((counter) => {
        observer.observe(counter);
      });
    }, 200);
  }

  private animateCounter(element: Element) {
    const target = element.parentElement?.getAttribute('data-count');
    if (!target) return;

    const targetValue = parseInt(target, 10);
    const duration = 2000; // 2 seconds
    const startTime = performance.now();
    const startValue = 0;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.floor(startValue + (targetValue - startValue) * easeOut);

      if (element instanceof HTMLElement) {
        const text = element.textContent || '';
        // Preserve formatting (K, M, %, etc.)
        if (text.includes('K')) {
          element.textContent = currentValue >= 1000 ? `${(currentValue / 1000).toFixed(1)}K+` : `${currentValue}+`;
        } else if (text.includes('M')) {
          element.textContent = currentValue >= 1000000 ? `${(currentValue / 1000000).toFixed(1)}M` : `${currentValue}`;
        } else if (text.includes('%')) {
          element.textContent = `${currentValue}%`;
        } else {
          element.textContent = currentValue.toString();
        }
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }
}

