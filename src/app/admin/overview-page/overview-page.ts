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
    
    // Fetch all data in parallel
    this.overviewService.getTotalUsers().subscribe({
      next: (users) => {
        this.overviewService.getTotalPosts().subscribe({
          next: (posts) => {
            this.overviewService.getTotalComments().subscribe({
              next: (comments) => {
                // Calculate metrics from API data
                this.metrics = [
                  { 
                    title: 'Total Users', 
                    value: users.length.toString(), 
                    icon: 'fas fa-users', 
                    trend: 'up', 
                    trendValue: '+12%' 
                  },
                  { 
                    title: 'Active Posts', 
                    value: posts.length.toString(), 
                    icon: 'fas fa-file-alt', 
                    trend: 'up', 
                    trendValue: '+8%' 
                  },
                  { 
                    title: 'Total Comments', 
                    value: comments.length.toString(), 
                    icon: 'fas fa-heart', 
                    trend: 'up', 
                    trendValue: '+5%' 
                  },
                  { 
                    title: 'Engagement Rate', 
                    value: `${((comments.length / posts.length) * 100).toFixed(1)}%`, 
                    icon: 'fas fa-chart-line', 
                    trend: 'up', 
                    trendValue: '+23%' 
                  },
                ];
                this.loading = false;
              },
              error: () => {
                this.loading = false;
              }
            });
          },
          error: () => {
            this.loading = false;
          }
        });
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}

