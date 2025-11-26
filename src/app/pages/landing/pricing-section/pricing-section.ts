import { Component, AfterViewInit, OnInit, OnDestroy, ElementRef, ViewChild, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AosService } from '../../../shared/services/aos.service';
import { ParallaxService } from '../../../shared/services/parallax.service';
import { BillingService } from '../../../services/client/billing.service';
import { BillingPlan } from '../../../models/billing.models';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-pricing-section',
  imports: [CommonModule],
  templateUrl: './pricing-section.html',
  styleUrl: './pricing-section.css',
})
export class PricingSection implements AfterViewInit, OnInit, OnDestroy {
  @ViewChild('pricingSection', { static: true }) pricingSection!: ElementRef<HTMLElement>;
  @ViewChild('parallaxBg', { static: true }) parallaxBg!: ElementRef<HTMLElement>;
  
  private readonly router = inject(Router);
  private readonly billingService = inject(BillingService);
  private readonly aosService = inject(AosService);
  private readonly parallaxService = inject(ParallaxService);
  private readonly cdr = inject(ChangeDetectorRef);
  
  scrollY = 0;
  plans: BillingPlan[] = [];
  loading = false;
  private subscriptions = new Subscription();

  ngOnInit() {
    this.loadPlans();
    this.subscriptions.add(
      this.parallaxService.scroll$.subscribe(scrollY => {
        this.scrollY = scrollY;
        this.updateParallax();
      })
    );
  }

  loadPlans(): void {
    this.loading = true;
    console.log('Loading plans, loading state:', this.loading);
    // Load all plans (both User and Agency) for the landing page
    this.billingService.getPlans().subscribe({
      next: (plans) => {
        console.log('Plans loaded:', plans);
        console.log('Plans count:', plans.length);
        console.log('Plans structure:', JSON.stringify(plans, null, 2));
        this.plans = Array.isArray(plans) ? plans : [];
        console.log('Before setting loading to false - plans.length:', this.plans.length);
        this.loading = false;
        console.log('After setting loading to false - loading:', this.loading, 'plans.length:', this.plans.length);
        // Force change detection immediately
        this.cdr.markForCheck();
        // Use setTimeout to ensure change detection runs
        setTimeout(() => {
          this.cdr.detectChanges();
          console.log('After detectChanges - loading:', this.loading, 'plans.length:', this.plans.length);
          // Refresh AOS after plans load
          if (this.plans.length > 0) {
            this.aosService.refreshAos();
          }
        }, 0);
      },
      error: (error) => {
        console.error('Error loading plans:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          error: error.error,
          message: error.message
        });
        this.loading = false;
        // Use empty array if API fails - will show empty state
        this.plans = [];
      },
    });
  }

  selectPlan(plan: BillingPlan): void {
    // Navigate to registration or login with plan selection
    this.router.navigate(['/auth/register'], { queryParams: { plan: plan.planId } });
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.aosService.refreshAos();
    }, 50);
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  private updateParallax() {
    if (!this.pricingSection || !this.parallaxBg) return;
    const elementOffset = this.parallaxService.getElementOffset(this.pricingSection.nativeElement);
    const bgOffset = this.parallaxService.calculateParallax(this.scrollY, elementOffset, 0.2);
    this.parallaxBg.nativeElement.style.transform = `translateY(${bgOffset}px)`;
  }
}
