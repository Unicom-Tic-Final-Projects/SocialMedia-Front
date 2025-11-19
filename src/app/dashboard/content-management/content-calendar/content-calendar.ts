import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { PostsService } from '../../../services/client/posts.service';
import { SocialPost } from '../../../models/post.models';

@Component({
  selector: 'app-content-calendar',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './content-calendar.html',
  styleUrl: './content-calendar.css'
})
export class ContentCalendarComponent implements OnInit {
  private readonly postsService = inject(PostsService);
  private readonly router = inject(Router);

  currentDate = signal(new Date());
  scheduledPosts = signal<SocialPost[]>([]);
  loading = signal(false);
  draggedPost = signal<SocialPost | null>(null);

  ngOnInit(): void {
    this.loadScheduledPosts();
  }

  loadScheduledPosts(): void {
    this.loading.set(true);
    this.postsService.getPostsByStatus('Scheduled').subscribe({
      next: (posts) => {
        this.scheduledPosts.set(posts);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  getPostsForDate(date: Date): SocialPost[] {
    const dateStr = date.toISOString().split('T')[0];
    return this.scheduledPosts().filter(post => {
      if (!post.scheduledAt) return false;
      const postDate = new Date(post.scheduledAt).toISOString().split('T')[0];
      return postDate === dateStr;
    });
  }

  getDaysInMonth(): Date[] {
    const year = this.currentDate().getFullYear();
    const month = this.currentDate().getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Date[] = [];
    
    // Add days from previous month to fill first week
    const startDay = firstDay.getDay();
    for (let i = startDay - 1; i >= 0; i--) {
      days.push(new Date(year, month, -i));
    }
    
    // Add days of current month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day));
    }
    
    // Add days from next month to fill last week
    const remainingDays = 42 - days.length; // 6 weeks * 7 days
    for (let day = 1; day <= remainingDays; day++) {
      days.push(new Date(year, month + 1, day));
    }
    
    return days;
  }

  previousMonth(): void {
    const newDate = new Date(this.currentDate());
    newDate.setMonth(newDate.getMonth() - 1);
    this.currentDate.set(newDate);
  }

  nextMonth(): void {
    const newDate = new Date(this.currentDate());
    newDate.setMonth(newDate.getMonth() + 1);
    this.currentDate.set(newDate);
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  isCurrentMonth(date: Date): boolean {
    return date.getMonth() === this.currentDate().getMonth();
  }

  // Drag and Drop handlers
  onDragStart(post: SocialPost, event: DragEvent): void {
    this.draggedPost.set(post);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', post.id);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onDrop(date: Date, event: DragEvent): void {
    event.preventDefault();
    const post = this.draggedPost();
    
    if (!post) return;

    // Create new date with time from original scheduled date
    const newDate = new Date(date);
    if (post.scheduledAt) {
      const originalDate = new Date(post.scheduledAt);
      newDate.setHours(originalDate.getHours());
      newDate.setMinutes(originalDate.getMinutes());
    } else {
      // Default to 9 AM if no time was set
      newDate.setHours(9, 0, 0, 0);
    }

    // Update the post's scheduled date
    this.reschedulePost(post.id, newDate.toISOString());
    this.draggedPost.set(null);
  }

  onDragEnd(): void {
    this.draggedPost.set(null);
  }

  reschedulePost(postId: string, newScheduledAt: string): void {
    this.loading.set(true);
    
    // Navigate to post editor to reschedule
    // In a full implementation, you might want to call an API directly
    this.router.navigate(['/dashboard/post-editor'], {
      queryParams: {
        postId,
        reschedule: 'true',
        scheduledAt: newScheduledAt
      }
    });
    
    this.loading.set(false);
  }

  editPost(postId: string): void {
    this.router.navigate(['/dashboard/post-editor'], {
      queryParams: { postId, edit: 'true' }
    });
  }
}

