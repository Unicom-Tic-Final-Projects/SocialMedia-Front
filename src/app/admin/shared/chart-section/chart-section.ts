import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-chart-section',
  imports: [CommonModule],
  templateUrl: './chart-section.html',
  styleUrl: './chart-section.css',
})
export class AdminChartSection {
  @Input() title = '';
  @Input() subtitle = '';
}

