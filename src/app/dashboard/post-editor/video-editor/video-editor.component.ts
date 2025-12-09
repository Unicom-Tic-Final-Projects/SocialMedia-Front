import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  ViewChild,
  ElementRef,
  signal,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VideoEditorService, VideoEditOptions } from '../../../services/shared/video-editor.service';
import { ToastService } from '../../../core/services/toast.service';
import { LoggingService } from '../../../core/services/logging.service';

@Component({
  selector: 'app-video-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './video-editor.component.html',
  styleUrl: './video-editor.component.css',
})
export class VideoEditorComponent implements OnInit {
  @Input() videoUrl: string = '';
  @Input() videoFile?: File;
  @Output() editedVideo = new EventEmitter<Blob>();
  @Output() editedVideoUrl = new EventEmitter<string>();

  @ViewChild('videoPlayer', { static: false }) videoPlayer!: ElementRef<HTMLVideoElement>;

  private readonly videoEditor = inject(VideoEditorService);
  private readonly toastService = inject(ToastService);
  private readonly loggingService = inject(LoggingService);

  // Video state
  duration = signal(0);
  currentTime = signal(0);
  startTime = signal(0);
  endTime = signal(0);
  loading = signal(false);
  processing = signal(false);

  // Filter adjustments
  brightness = signal(100);
  contrast = signal(100);
  saturation = signal(100);

  // Preview URL
  previewUrl = signal<string | null>(null);

  ngOnInit() {
    if (this.videoFile) {
      this.loadVideoMetadata();
    }
  }

  private async loadVideoMetadata() {
    if (!this.videoFile) return;

    try {
      const duration = await this.videoEditor.getVideoDuration(this.videoFile);
      this.duration.set(duration);
      this.endTime.set(duration);
      this.loggingService.debug('Video metadata loaded', { duration }, 'VideoEditor');
    } catch (error) {
      this.loggingService.error('Failed to load video metadata', error, 'VideoEditor');
      this.toastService.error('Failed to load video');
    }
  }

  onVideoLoaded() {
    if (this.videoPlayer?.nativeElement) {
      const video = this.videoPlayer.nativeElement;
      this.duration.set(video.duration);
      this.endTime.set(video.duration);
    }
  }

  onTimeUpdate() {
    if (this.videoPlayer?.nativeElement) {
      this.currentTime.set(this.videoPlayer.nativeElement.currentTime);
    }
  }

  seekTo(time: number) {
    if (this.videoPlayer?.nativeElement) {
      this.videoPlayer.nativeElement.currentTime = time;
      this.currentTime.set(time);
    }
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  async applyEdits() {
    if (!this.videoFile) {
      this.toastService.error('No video file available');
      return;
    }

    this.processing.set(true);
    this.toastService.info('Processing video... This may take a moment.');

    try {
      const options: VideoEditOptions = {
        startTime: this.startTime() > 0 ? this.startTime() : undefined,
        endTime: this.endTime() < this.duration() ? this.endTime() : undefined,
        brightness: this.brightness() !== 100 ? this.brightness() : undefined,
        contrast: this.contrast() !== 100 ? this.contrast() : undefined,
        saturation: this.saturation() !== 100 ? this.saturation() : undefined,
        quality: 'medium',
      };

      const editedBlob = await this.videoEditor.applyEdits(this.videoFile, options);

      // Create preview URL
      const url = URL.createObjectURL(editedBlob);
      this.previewUrl.set(url);

      // Emit events
      this.editedVideo.emit(editedBlob);
      this.editedVideoUrl.emit(url);

      this.toastService.success('Video edited successfully!');
      this.loggingService.debug('Video editing completed', { options }, 'VideoEditor');
    } catch (error) {
      this.loggingService.error('Error editing video', error, 'VideoEditor');
      this.toastService.error('Failed to edit video. Please try again.');
    } finally {
      this.processing.set(false);
    }
  }

  reset() {
    this.startTime.set(0);
    this.endTime.set(this.duration());
    this.brightness.set(100);
    this.contrast.set(100);
    this.saturation.set(100);
    this.previewUrl.set(null);
  }

  setStartTime() {
    this.startTime.set(this.currentTime());
    if (this.startTime() >= this.endTime()) {
      this.endTime.set(Math.min(this.startTime() + 1, this.duration()));
    }
  }

  setEndTime() {
    this.endTime.set(this.currentTime());
    if (this.endTime() <= this.startTime()) {
      this.startTime.set(Math.max(this.endTime() - 1, 0));
    }
  }
}

