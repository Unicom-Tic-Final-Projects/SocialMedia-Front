import { Component } from '@angular/core';
import { AdminDashboardCard } from '../shared/dashboard-card/dashboard-card';
import { AdminChartSection } from '../shared/chart-section/chart-section';

@Component({
  selector: 'app-admin-overview-page',
  imports: [AdminDashboardCard, AdminChartSection],
  templateUrl: './overview-page.html',
  styleUrl: './overview-page.css',
})
export class AdminOverviewPage {
  metrics = [
    { title: 'Total Users', value: '12,543', icon: 'fas fa-users', trend: 'up', trendValue: '+12%' },
    { title: 'Active Posts', value: '3,421', icon: 'fas fa-file-alt', trend: 'up', trendValue: '+8%' },
    { title: 'Engagement Rate', value: '68.5%', icon: 'fas fa-heart', trend: 'up', trendValue: '+5%' },
    { title: 'Revenue', value: '$45,231', icon: 'fas fa-dollar-sign', trend: 'up', trendValue: '+23%' },
  ];
}

