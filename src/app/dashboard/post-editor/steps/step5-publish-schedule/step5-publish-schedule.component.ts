import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-step5-publish-schedule',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './step5-publish-schedule.component.html',
  styleUrl: './step5-publish-schedule.component.css',
})
export class Step5PublishScheduleComponent {
  @Input() scheduleMode: 'now' | 'later' = 'now';
  @Input() scheduledDateTime = '';
  @Input() saving = false;

  @Output() scheduleModeChange = new EventEmitter<'now' | 'later'>();
  @Output() scheduledDateTimeChange = new EventEmitter<string>();

  onScheduleModeChange(mode: 'now' | 'later'): void {
    this.scheduleModeChange.emit(mode);
  }

  onScheduledDateTimeChange(value: string): void {
    this.scheduledDateTimeChange.emit(value);
  }
}

