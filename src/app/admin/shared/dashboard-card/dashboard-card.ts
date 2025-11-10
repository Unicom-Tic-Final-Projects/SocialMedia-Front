import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-dashboard-card',
  imports: [CommonModule],
  templateUrl: './dashboard-card.html',
  styleUrl: './dashboard-card.css',
})
export class AdminDashboardCard {
  @Input() title = '';
  @Input() value: string | number = '';
  @Input() icon = '';
  @Input() trend?: string;
  @Input() trendValue?: string;
  @Input() color: 'primary' | 'success' | 'warning' | 'danger' = 'primary';
}

