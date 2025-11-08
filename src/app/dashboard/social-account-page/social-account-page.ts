import { Component } from '@angular/core';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-social-account-page',
  imports: [RouterModule, CommonModule],
  templateUrl: './social-account-page.html',
  styleUrl: './social-account-page.css',
})
export class SocialAccountPage {
  showGrid = true;

  constructor(private router: Router) {
    this.updateShowGrid();
    
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateShowGrid();
      });
  }

  private updateShowGrid() {
    const url = this.router.url;
    // Show grid only when we're at the base social-account route, not on child routes
    this.showGrid = url === '/social-account' || url === '/social-account/';
  }
}
