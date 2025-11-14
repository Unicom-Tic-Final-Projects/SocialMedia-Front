import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-agency-clients-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './clients-page.html',
  styleUrl: './clients-page.css',
})
export class AgencyClientsPage {
  readonly placeholderClients = [
    {
      name: 'Acme Outdoors',
      industry: 'Retail & E-commerce',
      status: 'Active',
    },
    {
      name: 'Bright Future Learning',
      industry: 'Education',
      status: 'Invitation Pending',
    },
  ];
}

