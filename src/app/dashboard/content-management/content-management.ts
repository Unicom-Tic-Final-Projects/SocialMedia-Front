import { Component, OnInit, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScreenSizeService } from '../../core/services/screen-size.service';
import { ContentManagementMobile } from './content-management-mobile/content-management-mobile';
import { ContentManagementDesktop } from './content-management-desktop/content-management-desktop';

@Component({
  selector: 'app-content-management',
  standalone: true,
  imports: [
    CommonModule,
    ContentManagementMobile,
    ContentManagementDesktop,
  ],
  templateUrl: './content-management.html',
  styleUrl: './content-management.css',
})
export class ContentManagementComponent implements OnInit {
  private readonly screenSizeService = inject(ScreenSizeService);

  // Use screen size service to determine which component to render
  readonly isMobile = this.screenSizeService.isMobile;
  readonly isTablet = this.screenSizeService.isTablet;
  readonly isDesktop = this.screenSizeService.isDesktop;

  ngOnInit(): void {
    // Component initialization if needed
  }
}
