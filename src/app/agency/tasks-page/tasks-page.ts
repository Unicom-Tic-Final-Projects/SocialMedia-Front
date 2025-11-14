import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

type TaskStatus = 'Pending' | 'In Progress' | 'Completed';

interface PlaceholderTask {
  title: string;
  client: string;
  status: TaskStatus;
  dueDate: string;
}

@Component({
  selector: 'app-agency-tasks-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tasks-page.html',
  styleUrl: './tasks-page.css',
})
export class AgencyTasksPage {
  readonly lanes: { title: string; status: TaskStatus; tasks: PlaceholderTask[] }[] = [
    {
      title: 'Backlog',
      status: 'Pending',
      tasks: [
        {
          title: 'Draft Q4 content calendar',
          client: 'Acme Outdoors',
          status: 'Pending',
          dueDate: 'Oct 15',
        },
      ],
    },
    {
      title: 'In Progress',
      status: 'In Progress',
      tasks: [
        {
          title: 'Finalize Instagram creatives',
          client: 'Bright Future Learning',
          status: 'In Progress',
          dueDate: 'Oct 05',
        },
      ],
    },
    {
      title: 'Ready for Approval',
      status: 'Completed',
      tasks: [],
    },
  ];
}

