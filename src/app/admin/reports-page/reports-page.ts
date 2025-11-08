import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminChartSection } from '../shared/chart-section/chart-section';

@Component({
  selector: 'app-admin-reports-page',
  imports: [CommonModule, AdminChartSection],
  templateUrl: './reports-page.html',
  styleUrl: './reports-page.css',
})
export class AdminReportsPage {
  reports = [
    { title: 'Monthly Analytics Report', date: '2024-11-01', type: 'Analytics', status: 'Generated' },
    { title: 'User Activity Summary', date: '2024-10-28', type: 'Users', status: 'Generated' },
    { title: 'Post Performance Report', date: '2024-10-25', type: 'Posts', status: 'Pending' },
  ];
}

