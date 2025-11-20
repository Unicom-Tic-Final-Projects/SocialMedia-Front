import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { AosService } from './shared/services/aos.service';
import { ToastMessageComponent } from './shared/ui/toast-message/toast-message';
import { ConfirmationDialogComponent } from './shared/ui/confirmation-dialog/confirmation-dialog';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastMessageComponent, ConfirmationDialogComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal('onevo');
  private routerSubscription?: Subscription;

  constructor(
    private router: Router,
    private aosService: AosService
  ) {}

  ngOnInit() {
    // Refresh AOS on route navigation
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        // Small delay to ensure DOM is updated
        setTimeout(() => {
          this.aosService.refreshAos();
        }, 100);
      });
  }

  ngOnDestroy() {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }
}
