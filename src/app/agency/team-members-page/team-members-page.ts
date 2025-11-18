import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { TeamMembersService } from '../../services/agency/team-members.service';
import { TeamMember, CreateTeamMemberRequest, UpdateTeamMemberRequest } from '../../models/team-member.models';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-agency-team-members-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatePipe],
  templateUrl: './team-members-page.html',
  styleUrl: './team-members-page.css',
})
export class AgencyTeamMembersPage implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly teamMembersService = inject(TeamMembersService);

  readonly teamMembers = this.teamMembersService.teamMembers;
  readonly loading = this.teamMembersService.loading;
  readonly error = this.teamMembersService.error;

  showModal = signal(false);
  isEditing = signal(false);
  editingMember = signal<TeamMember | null>(null);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  teamMemberForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', []], // Optional for edit mode
    confirmPassword: ['', []], // Optional for edit mode
    role: ['Editor', [Validators.required]],
  }, {
    validators: this.passwordMatchValidator,
  });

  private loadSubscription: Subscription | null = null;

  readonly roles = [
    { value: 'Admin', label: 'Admin' },
    { value: 'Editor', label: 'Editor' },
  ];

  ngOnInit(): void {
    this.loadSubscription = this.teamMembersService.loadTeamMembers().subscribe({
      error: (error) => {
        console.error('Failed to load team members', error);
        this.errorMessage.set('Failed to load team members. Please try again.');
        setTimeout(() => this.errorMessage.set(null), 5000);
      },
    });
  }

  ngOnDestroy(): void {
    this.loadSubscription?.unsubscribe();
  }

  openCreateModal(): void {
    this.isEditing.set(false);
    this.editingMember.set(null);
    this.teamMemberForm.reset({
      role: 'Editor',
    });
    // Set password as required for create mode
    this.teamMemberForm.controls.password.setValidators([Validators.required, Validators.minLength(6)]);
    this.teamMemberForm.controls.confirmPassword.setValidators([Validators.required]);
    this.teamMemberForm.updateValueAndValidity();
    this.errorMessage.set(null);
    this.showModal.set(true);
  }

  openEditModal(member: TeamMember): void {
    this.isEditing.set(true);
    this.editingMember.set(member);
    this.errorMessage.set(null);
    this.teamMemberForm.patchValue({
      email: member.email,
      role: member.role,
      password: '',
      confirmPassword: '',
    });
    // Password is optional for edit mode
    this.teamMemberForm.controls.password.clearValidators();
    this.teamMemberForm.controls.confirmPassword.clearValidators();
    // Only validate password if it's provided
    this.teamMemberForm.controls.password.setValidators([Validators.minLength(6)]);
    this.teamMemberForm.controls.confirmPassword.setValidators([]);
    this.teamMemberForm.updateValueAndValidity();
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.isEditing.set(false);
    this.editingMember.set(null);
    this.teamMemberForm.reset();
    this.errorMessage.set(null);
  }

  saveTeamMember(): void {
    if (this.teamMemberForm.invalid) {
      this.teamMemberForm.markAllAsTouched();
      return;
    }

    const formValue = this.teamMemberForm.value;

    if (this.isEditing() && this.editingMember()) {
      // Update existing team member
      const updateRequest: UpdateTeamMemberRequest = {
        email: formValue.email!.trim(),
        role: formValue.role as 'Admin' | 'Editor',
      };

      this.teamMembersService.updateTeamMember(this.editingMember()!.userId, updateRequest).subscribe({
        next: () => {
          this.successMessage.set('Team member updated successfully');
          this.closeModal();
          setTimeout(() => this.successMessage.set(null), 3000);
        },
        error: (error) => {
          console.error('Failed to update team member', error);
          // Extract error message from various possible locations
          const errorMsg = error?.userMessage || 
                         error?.error?.message || 
                         error?.error?.errors?.[0] || 
                         error?.message || 
                         'Failed to update team member. Please try again.';
          this.errorMessage.set(errorMsg);
          setTimeout(() => this.errorMessage.set(null), 5000);
        },
      });
    } else {
      // Create new team member
      const createRequest: CreateTeamMemberRequest = {
        email: formValue.email!.trim(),
        password: formValue.password!,
        role: formValue.role as 'Admin' | 'Editor',
      };

      this.teamMembersService.createTeamMember(createRequest).subscribe({
        next: () => {
          this.successMessage.set('Team member created successfully');
          this.closeModal();
          setTimeout(() => this.successMessage.set(null), 3000);
        },
        error: (error) => {
          console.error('Failed to create team member', error);
          // Extract error message from various possible locations
          const errorMsg = error?.userMessage || 
                         error?.error?.message || 
                         error?.error?.errors?.[0] || 
                         error?.message || 
                         'Failed to create team member. Please try again.';
          this.errorMessage.set(errorMsg);
          setTimeout(() => this.errorMessage.set(null), 5000);
        },
      });
    }
  }

  deleteTeamMember(member: TeamMember): void {
    if (!confirm(`Are you sure you want to remove "${member.email}" from the team? This action cannot be undone.`)) {
      return;
    }

    this.teamMembersService.deleteTeamMember(member.userId).subscribe({
      next: () => {
        this.successMessage.set('Team member removed successfully');
        setTimeout(() => this.successMessage.set(null), 3000);
      },
      error: (error) => {
        console.error('Failed to delete team member', error);
        this.errorMessage.set(error?.message || 'Failed to remove team member. Please try again.');
        setTimeout(() => this.errorMessage.set(null), 5000);
      },
    });
  }

  trackMemberById(_: number, member: TeamMember): string {
    return member.userId;
  }

  getRoleBadgeClass(role: string): string {
    const roleClasses: Record<string, string> = {
      Admin: 'bg-red-50 text-red-600',
      Editor: 'bg-blue-50 text-blue-600',
    };
    return roleClasses[role] || 'bg-gray-50 text-gray-600';
  }

  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (!password || !confirmPassword) {
      return null;
    }

    return password.value === confirmPassword.value ? null : { passwordMismatch: true };
  }
}

