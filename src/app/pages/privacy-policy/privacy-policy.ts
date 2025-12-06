import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AppHeader } from '../../shared/app-header/app-header';
import { AppFooter } from '../../shared/app-footer/app-footer';

@Component({
  selector: 'app-privacy-policy',
  standalone: true,
  imports: [CommonModule, RouterLink, AppHeader, AppFooter],
  templateUrl: './privacy-policy.html',
  styleUrl: './privacy-policy.css'
})
export class PrivacyPolicyComponent {
  currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

