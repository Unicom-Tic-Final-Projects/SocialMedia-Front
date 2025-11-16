import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ProfileService } from '../../services/client/profile.service';
import { UserProfile } from '../../models/social.models';

@Component({
  selector: 'app-profile-page',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.css',
})
export class ProfilePage implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly profileService = inject(ProfileService);
  private readonly fb = inject(FormBuilder);

  profileForm!: FormGroup;
  loading = signal(false);
  saving = signal(false);
  profile = signal<UserProfile | null>(null);
  user = this.authService.user;

  ngOnInit(): void {
    this.initializeForm();
    this.loadProfile();
  }

  private initializeForm(): void {
    this.profileForm = this.fb.group({
      fullName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
    });
  }

  private loadProfile(): void {
    this.loading.set(true);
    
    // Get user from auth service
    const currentUser = this.authService.user();
    
    if (currentUser) {
      // Load profile using profile service
      this.profileService.loadProfile().subscribe({
        next: (profile) => {
          this.profile.set(profile);
          this.profileForm.patchValue({
            fullName: profile.fullName || currentUser.tenantName || '',
            email: profile.email || currentUser.email || '',
          });
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error loading profile:', error);
          // Fallback to auth user data
          this.profileForm.patchValue({
            fullName: currentUser.tenantName || currentUser.email?.split('@')[0] || 'User',
            email: currentUser.email || '',
          });
          this.loading.set(false);
        }
      });
    } else {
      // Try to load current user from API
      this.authService.loadCurrentUser().subscribe({
        next: (user) => {
          if (user) {
            this.profileForm.patchValue({
              fullName: user.tenantName || user.email?.split('@')[0] || 'User',
              email: user.email || '',
            });
          }
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error loading user:', error);
          this.loading.set(false);
        }
      });
    }
  }

  onSave(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const formValue = this.profileForm.value;
    const userId = this.profile()?.id || 0;

    this.profileService.updateProfile(userId, {
      fullName: formValue.fullName,
      email: formValue.email,
    }).subscribe({
      next: (updatedProfile) => {
        this.profile.set(updatedProfile);
        this.saving.set(false);
        // Show success message (you can add a toast notification here)
        alert('Profile updated successfully!');
      },
      error: (error) => {
        console.error('Error updating profile:', error);
        this.saving.set(false);
        alert('Failed to update profile. Please try again.');
      }
    });
  }

  getDisplayName(): string {
    const profile = this.profile();
    const user = this.user();
    return profile?.fullName || user?.tenantName || user?.email?.split('@')[0] || 'User';
  }

  getRole(): string {
    const user = this.user();
    if (user?.tenantType === 'Agency') {
      return 'Agency Owner';
    } else if (user?.tenantType === 'Individual') {
      return 'Individual User';
    } else if (user?.role) {
      return user.role;
    }
    return 'User';
  }

  getAvatarUrl(): string {
    const profile = this.profile();
    return profile?.avatarUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(this.getDisplayName()) + '&background=4C6FFF&color=fff';
  }
}
