import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminChartSection } from '../shared/chart-section/chart-section';
import { AnalyticsService } from '../../services/admin/analytics.service';

@Component({
  selector: 'app-admin-analytics-page',
  imports: [CommonModule, AdminChartSection],
  templateUrl: './analytics-page.html',
  styleUrl: './analytics-page.css',
})
export class AdminAnalyticsPage implements OnInit {
  totalViews = 0;
  activeUsers = 0;
  engagement = 0;
  loading = true;

  constructor(private analyticsService: AnalyticsService) {}

  ngOnInit() {
    this.loadAnalyticsData();
  }

  loadAnalyticsData() {
    this.loading = true;
    
    // Fetch analytics data
    this.analyticsService.getAnalyticsData().subscribe({
      next: (posts) => {
        this.analyticsService.getUserGrowthData().subscribe({
          next: (users) => {
            this.analyticsService.getEngagementData().subscribe({
              next: (comments) => {
                // Calculate metrics from API data
                this.totalViews = posts.length * 1000; // Mock calculation
                this.activeUsers = users.length;
                this.engagement = posts.length > 0 
                  ? ((comments.length / posts.length) * 100) 
                  : 0;
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

