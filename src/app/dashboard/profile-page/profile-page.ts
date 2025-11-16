import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ProfileService } from '../../services/client/profile.service';
import { ClientContextService } from '../../services/client/client-context.service';
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
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  readonly clientContextService = inject(ClientContextService);

  // Initialize form immediately to avoid template errors
  profileForm = this.fb.group({
    fullName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
  });
  
  loading = signal(false);
  saving = signal(false);
  profile = signal<UserProfile | null>(null);
  user = this.authService.user;
  
  // Client context
  readonly isViewingClient = this.clientContextService.isViewingClientDashboard;
  readonly selectedClient = this.clientContextService.selectedClient;
  readonly clientUser = this.clientContextService.clientUser;

  async ngOnInit(): Promise<void> {
    // Extract clientId from route if available
    let route = this.route;
    while (route.firstChild) {
      route = route.firstChild;
    }
    
    // Check parent routes for clientId
    let parentRoute = this.route.parent;
    while (parentRoute) {
      const clientId = parentRoute.snapshot.params['clientId'];
      if (clientId) {
        await this.clientContextService.initializeFromRoute(clientId);
        break;
      }
      parentRoute = parentRoute.parent;
    }

    this.loadProfile();
  }

  private loadProfile(): void {
    this.loading.set(true);
    
    // Check if viewing client dashboard
    const isViewingClient = this.isViewingClient();
    const client = this.selectedClient();
    const clientUser = this.clientUser();
    
    if (isViewingClient && client && clientUser) {
      // Show client's information
      this.profileForm.patchValue({
        fullName: client.name || '',
        email: clientUser.email || '',
      });
      this.loading.set(false);
      return;
    }
    
    // Get user from auth service (agency owner or individual user)
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

    // If viewing client dashboard, don't allow saving (read-only view)
    if (this.isViewingClient()) {
      alert('Cannot edit client profile from agency dashboard. This is a read-only view.');
      return;
    }

    this.saving.set(true);
    const formValue = this.profileForm.value;
    const userId = this.profile()?.id || 0;

    this.profileService.updateProfile(userId, {
      fullName: formValue.fullName ?? undefined,
      email: formValue.email ?? undefined,
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
    // If viewing client dashboard, show client name
    if (this.isViewingClient() && this.selectedClient()) {
      return this.selectedClient()!.name;
    }
    
    const profile = this.profile();
    const user = this.user();
    return profile?.fullName || user?.tenantName || user?.email?.split('@')[0] || 'User';
  }

  getRole(): string {
    // If viewing client dashboard, show client role
    if (this.isViewingClient() && this.clientUser()) {
      return this.clientUser()!.role || 'Client';
    }
    
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
