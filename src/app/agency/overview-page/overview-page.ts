import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-agency-overview-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './overview-page.html',
  styleUrl: './overview-page.css',
})
export class AgencyOverviewPage {
  readonly highlights = [
    {
      label: 'Active Clients',
      value: 0,
      description: 'Onboard clients to see activity here.',
    },
    {
      label: 'Open Tasks',
      value: 0,
      description: 'Assign tasks to team members.',
    },
    {
      label: 'Pending Approvals',
      value: 0,
      description: 'Connect approval workflows to track progress.',
    },
  ];
}

