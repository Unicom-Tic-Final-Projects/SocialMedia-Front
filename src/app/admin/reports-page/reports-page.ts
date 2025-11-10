import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminChartSection } from '../shared/chart-section/chart-section';
import { ReportsService } from '../../services/admin/reports.service';

@Component({
  selector: 'app-admin-reports-page',
  imports: [CommonModule, AdminChartSection],
  templateUrl: './reports-page.html',
  styleUrl: './reports-page.css',
})
export class AdminReportsPage implements OnInit {
  reports: any[] = [];
  loading = true;

  constructor(private reportsService: ReportsService) {}

  ngOnInit() {
    this.loadReports();
  }

  loadReports() {
    this.loading = true;
    this.reportsService.getReports().subscribe({
      next: (reports) => {
        // Transform API data to match template structure
        this.reports = reports.map((report, index) => ({
          id: report.id,
          title: report.title || `Report ${index + 1}`,
          date: new Date().toISOString().split('T')[0],
          type: index === 0 ? 'Analytics' : index === 1 ? 'Users' : 'Posts',
          status: index < 2 ? 'Generated' : 'Pending'
        }));
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading reports:', error);
        this.loading = false;
      }
    });
  }

  downloadReport(reportId: number) {
    this.reportsService.downloadReport(reportId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report-${reportId}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error downloading report:', error);
      }
    });
  }
}

