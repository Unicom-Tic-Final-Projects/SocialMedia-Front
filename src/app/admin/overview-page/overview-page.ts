import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminDashboardCard } from '../shared/dashboard-card/dashboard-card';
import { AdminChartSection } from '../shared/chart-section/chart-section';
import { OverviewService } from '../../services/admin/overview.service';

@Component({
  selector: 'app-admin-overview-page',
  imports: [CommonModule, AdminDashboardCard, AdminChartSection],
  templateUrl: './overview-page.html',
  styleUrl: './overview-page.css',
})
export class AdminOverviewPage implements OnInit {
  metrics: any[] = [];
  loading = true;

  constructor(private overviewService: OverviewService) {}

  ngOnInit() {
    this.loadOverviewData();
  }

  loadOverviewData() {
    this.loading = true;
    this.metrics = []; // Clear existing metrics while loading
    
    this.overviewService.getOverviewData().subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success && response.data) {
          const stats = response.data;
          this.metrics = [
            { 
              title: 'Total Users', 
              value: stats.totalUsers.toString(), 
              icon: 'fas fa-users', 
              trend: 'up', 
              trendValue: '+12%' 
            },
            { 
              title: 'Total Tenants', 
              value: stats.totalTenants.toString(), 
              icon: 'fas fa-building', 
              trend: 'up', 
              trendValue: '+8%' 
            },
            { 
              title: 'Published Posts', 
              value: stats.publishedPosts.toString(), 
              icon: 'fas fa-file-alt', 
              trend: 'up', 
              trendValue: '+5%' 
            },
            { 
              title: 'Social Accounts', 
              value: stats.totalSocialAccounts.toString(), 
              icon: 'fas fa-link', 
              trend: 'up', 
              trendValue: '+23%' 
            },
            {
              title: 'Individual Tenants',
              value: stats.individualTenants.toString(),
              icon: 'fas fa-user',
              trend: 'up',
              trendValue: '+5%'
            },
            {
              title: 'Agency Tenants',
              value: stats.agencyTenants.toString(),
              icon: 'fas fa-briefcase',
              trend: 'up',
              trendValue: '+8%'
            }
          ];
        } else {
          this.metrics = []; // Ensure metrics array is empty if no data
        }
      },
      error: (error) => {
        console.error('Error loading overview data:', error);
        this.loading = false;
        this.metrics = []; // Clear metrics on error
      }
    });
  }
}

