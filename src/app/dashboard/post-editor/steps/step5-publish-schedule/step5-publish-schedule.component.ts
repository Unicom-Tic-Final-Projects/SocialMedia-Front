import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-step5-publish-schedule',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './step5-publish-schedule.component.html',
  styleUrl: './step5-publish-schedule.component.css',
})
export class Step5PublishScheduleComponent {
  @Input() scheduleMode: 'now' | 'later' | 'draft' = 'draft';
  @Input() scheduledDateTime = '';
  @Input() saving = false;

  @Output() scheduleModeChange = new EventEmitter<'now' | 'later' | 'draft'>();
  @Output() scheduledDateTimeChange = new EventEmitter<string>();

  // Get minimum date/time (current date/time) for datetime-local input
  // Format: YYYY-MM-DDTHH:mm (required format for datetime-local input)
  readonly minDateTime = computed(() => {
    const now = new Date();
    // Format as YYYY-MM-DDTHH:mm for datetime-local input
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  });

  onScheduleModeChange(mode: 'now' | 'later' | 'draft'): void {
    this.scheduleModeChange.emit(mode);
  }

  onScheduledDateTimeChange(value: string): void {
    this.scheduledDateTimeChange.emit(value);
  }
}

