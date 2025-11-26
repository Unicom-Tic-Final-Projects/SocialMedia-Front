import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { UsersService, AdminUserResponse, AdminTenantResponse, CreateUserRequest, UpdateUserRequest, CreateTenantRequest, UpdateTenantRequest } from '../../services/admin/users.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-admin-users-page',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './users-page.html',
  styleUrl: './users-page.css',
})
export class AdminUsersPage implements OnInit {
  private usersService = inject(UsersService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  users: any[] = [];
  tenants = signal<AdminTenantResponse[]>([]);
  loading = signal(true);
  showModal = signal(false);
  showTenantModal = signal(false);
  isEditMode = signal(false);
  editingUser: any = null;
  saving = signal(false);
  savingTenant = signal(false);
  errorMessage = signal<string | null>(null);
  tenantCreatedSuccessfully = signal(false);
  
  userForm: FormGroup;
  tenantForm: FormGroup;
  selectedTenantType = signal<string | null>(null); // Track selected tenant type
  emailExists = signal<boolean>(false); // Flag to track if email already exists
  checkingEmail = signal<boolean>(false); // Flag to track email validation in progress
  
  // Computed signal for tenant groups - only recomputes when tenants signal changes
  tenantGroups = computed(() => {
    const groups = {
      'Agency Tenants': [] as AdminTenantResponse[],
      'Individual Tenants': [] as AdminTenantResponse[]
    };

    this.tenants().forEach(tenant => {
      if (tenant.tenantType === 'Agency') {
        groups['Agency Tenants'].push(tenant);
      } else if (tenant.tenantType === 'Individual') {
        groups['Individual Tenants'].push(tenant);
      }
    });

    return [
      { type: 'Agency Tenants', tenants: groups['Agency Tenants'] },
      { type: 'Individual Tenants', tenants: groups['Individual Tenants'] }
    ].filter(group => group.tenants.length > 0);
  });

  constructor() {
    this.userForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['Member', [Validators.required]],
      tenantId: ['', [Validators.required]],
      isActive: [true]
    });

    // Watch tenant selection to update available roles
    this.userForm.get('tenantId')?.valueChanges.subscribe(tenantId => {
      const tenant = this.tenants().find(t => t.tenantId === tenantId);
      this.selectedTenantType.set(tenant?.tenantType || null);
      
      // If Agency tenant, suggest Admin or Editor role
      if (tenant?.tenantType === 'Agency' && this.userForm.get('role')?.value === 'Member') {
        this.userForm.patchValue({ role: 'Admin' }, { emitEvent: false });
      }
    });

    this.tenantForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]], // Email becomes tenant name and owner email
      displayName: [''], // Optional display name for tenant
      tenantType: ['Individual', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    // Auto-update display name to email if empty when email changes
    // Also check if email already exists
    this.tenantForm.get('email')?.valueChanges.subscribe(email => {
      const displayName = this.tenantForm.get('displayName');
      if (displayName && !displayName.value && email) {
        // Optionally set display name to email prefix
        const emailPrefix = email.split('@')[0];
        displayName.setValue(emailPrefix);
      }
      
      // Check if email already exists in users list
      this.checkEmailExists(email);
    });
  }

  ngOnInit() {
    this.loadUsers();
    this.loadTenants();
  }

  trackByUserId(index: number, user: any): any {
    return user.id || index;
  }

  loadUsers() {
    this.loading.set(true);
    this.users = []; // Clear existing users while loading
    this.usersService.getUsers().subscribe({
      next: (response) => {
        this.loading.set(false);
        if (response.success && response.data) {
          this.users = response.data.map(user => ({
            id: user.userId,
            name: user.email.split('@')[0],
            email: user.email,
            role: user.role,
            status: user.isActive ? 'active' : 'inactive',
            tenantType: user.tenantType,
            tenantName: user.tenantName,
            tenantId: user.tenantId,
            isActive: user.isActive,
            joined: new Date(user.createdAt).toISOString().split('T')[0]
          }));
        } else {
          this.users = []; // Ensure users array is empty if no data
        }
      },
      error: (error: any) => {
        console.error('Error loading users:', error);
        this.loading.set(false);
        this.users = []; // Clear users on error
      }
    });
  }

  loadTenants() {
    this.usersService.getTenants().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.tenants.set(response.data.filter(t => t.isActive));
          // Update selected tenant type if tenant is already selected
          const selectedTenantId = this.userForm.get('tenantId')?.value;
          if (selectedTenantId) {
            const tenant = this.tenants().find(t => t.tenantId === selectedTenantId);
            this.selectedTenantType.set(tenant?.tenantType || null);
          }
        }
      },
      error: (error: any) => {
        console.error('Error loading tenants:', error);
      }
    });
  }

  openCreateModal() {
    this.isEditMode.set(false);
    this.editingUser = null;
    this.errorMessage.set(null);
    this.selectedTenantType.set(null);
    this.userForm.reset({
      email: '',
      password: '',
      role: 'Member',
      tenantId: '',
      isActive: true
    });
    this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.userForm.get('password')?.updateValueAndValidity();
    this.showModal.set(true);
  }

  openEditModal(user: any) {
    this.isEditMode.set(true);
    this.editingUser = user;
    this.errorMessage.set(null);
    this.userForm.patchValue({
      email: user.email,
      password: '', // Don't populate password
      role: user.role,
      tenantId: user.tenantId,
      isActive: user.isActive
    });
    // Password is optional in edit mode
    this.userForm.get('password')?.clearValidators();
    this.userForm.get('password')?.updateValueAndValidity();
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.userForm.reset();
    this.errorMessage.set(null);
  }

  openTenantModal() {
    this.showTenantModal.set(true);
    this.errorMessage.set(null);
    this.emailExists.set(false);
    this.tenantForm.reset({
      email: '',
      displayName: '',
      tenantType: 'Individual',
      password: ''
    });
  }

  closeTenantModal() {
    this.showTenantModal.set(false);
    // Reset form when closing
    this.tenantForm.reset({
      email: '',
      displayName: '',
      tenantType: 'Individual',
      password: ''
    });
    this.errorMessage.set(null);
    this.tenantCreatedSuccessfully.set(false);
    this.emailExists.set(false);
  }

  checkEmailExists(email: string | null | undefined): void {
    if (!email || !this.tenantForm.get('email')?.valid) {
      this.emailExists.set(false);
      return;
    }

    // Check if email exists in the loaded users list (only active users - isActive = true)
    // Soft-deleted users (isActive = false) will be reactivated by the backend
    const normalizedEmail = email.trim().toLowerCase();
    const exists = this.users.some((user: AdminUserResponse) => 
      user.email.toLowerCase() === normalizedEmail && user.isActive === true
    );
    this.emailExists.set(exists);
    
    // If active email exists, mark the email field as invalid
    const emailControl = this.tenantForm.get('email');
    if (exists && emailControl) {
      emailControl.setErrors({ ...emailControl.errors, emailExists: true });
    } else if (emailControl && emailControl.errors?.['emailExists']) {
      // Remove emailExists error if email doesn't exist anymore
      const errors = { ...emailControl.errors };
      delete errors['emailExists'];
      emailControl.setErrors(Object.keys(errors).length > 0 ? errors : null);
    }
  }

  saveTenant() {
    // Re-check email exists before submission
    const email = this.tenantForm.get('email')?.value;
    this.checkEmailExists(email);
    
    // If email exists, show error and don't submit
    if (this.emailExists()) {
      this.errorMessage.set('A user with this email already exists. Please use a different email address.');
      this.tenantForm.get('email')?.markAsTouched();
      return;
    }
    
    if (this.tenantForm.invalid) {
      this.tenantForm.markAllAsTouched();
      return;
    }

    this.savingTenant.set(true);
    this.errorMessage.set(null);

    const formValue = this.tenantForm.value;
    // Email becomes tenant name and owner email
    const tenantName = formValue.displayName?.trim() || formValue.email?.split('@')[0] || formValue.email;
    const createRequest: CreateTenantRequest = {
      name: tenantName, // Use display name if provided, otherwise use email prefix, otherwise email itself
      tenantType: formValue.tenantType,
      ownerEmail: formValue.email, // Email becomes owner email
      ownerPassword: formValue.password // Password for owner
    };

    this.usersService.createTenant(createRequest).subscribe({
      next: (response) => {
        this.savingTenant.set(false);
        if (response.success && response.data) {
          // Reload tenants and users if owner was created
          this.loadTenants();
          if (formValue.createOwner) {
            this.loadUsers();
          }
          
          // Preserve email and display name in form (don't clear them)
          // Only clear password for security
          this.tenantForm.patchValue({
            password: ''
          });
          
          // Show success - preserve form values so admin can see what was created
          this.errorMessage.set(null);
          this.tenantCreatedSuccessfully.set(true);
          
          // Close modal after a short delay to show success
          setTimeout(() => {
            this.closeTenantModal();
            this.tenantCreatedSuccessfully.set(false);
            
            // If user modal is open, set the newly created tenant as selected
            const newTenantId = response.data?.tenantId;
            if (this.showModal() && newTenantId) {
              // Use setTimeout to avoid triggering change detection during callback
              setTimeout(() => {
                this.userForm.patchValue({
                  tenantId: newTenantId
                });
              }, 0);
            }
          }, 2000); // Show success for 2 seconds before closing
        } else {
          this.errorMessage.set(response.message || 'Failed to create tenant');
        }
      },
      error: (error: any) => {
        console.error('Error creating tenant:', error);
        this.savingTenant.set(false);
        // Extract error message safely
        const errorMsg = error?.error?.message || error?.message || 'Failed to create tenant';
        this.errorMessage.set(errorMsg);
        
        // If error is about email already existing, set the flag
        if (errorMsg.toLowerCase().includes('email already exists') || 
            errorMsg.toLowerCase().includes('user with this email')) {
          this.emailExists.set(true);
          const emailControl = this.tenantForm.get('email');
          if (emailControl) {
            emailControl.setErrors({ ...emailControl.errors, emailExists: true });
            emailControl.markAsTouched();
          }
          // Reload users to get the latest list
          this.loadUsers();
        }
      }
    });
  }

  saveUser() {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);

    const formValue = this.userForm.value;
    const currentUser = this.authService.getCurrentUser();
    
    if (this.isEditMode() && this.editingUser) {
      // Update user
      const updateRequest: UpdateUserRequest = {
        email: formValue.email,
        role: formValue.role,
        tenantId: formValue.tenantId,
        isActive: formValue.isActive
      };
      
      // Only include password if provided
      if (formValue.password) {
        updateRequest.password = formValue.password;
      }

      this.usersService.updateUser(this.editingUser.id, updateRequest).subscribe({
        next: (response) => {
          if (response.success) {
            this.closeModal();
            this.loadUsers();
          } else {
            this.errorMessage.set(response.message || 'Failed to update user');
          }
          this.saving.set(false);
        },
        error: (error: any) => {
          console.error('Error updating user:', error);
          this.errorMessage.set(error.error?.message || 'Failed to update user');
          this.saving.set(false);
        }
      });
    } else {
      // Create user
      const createRequest: CreateUserRequest = {
        email: formValue.email,
        password: formValue.password,
        role: formValue.role,
        tenantId: formValue.tenantId
      };

      this.usersService.createUser(createRequest).subscribe({
        next: (response) => {
          if (response.success) {
            this.closeModal();
            this.loadUsers();
          } else {
            this.errorMessage.set(response.message || 'Failed to create user');
          }
          this.saving.set(false);
        },
        error: (error: any) => {
          console.error('Error creating user:', error);
          this.errorMessage.set(error.error?.message || 'Failed to create user');
          this.saving.set(false);
        }
      });
    }
  }

  deleteUser(id: string | number) {
    if (confirm('Are you sure you want to delete this user?')) {
      this.usersService.deleteUser(id.toString()).subscribe({
        next: (response) => {
          if (response.success) {
            this.loadUsers();
          } else {
            alert(response.message || 'Failed to delete user');
          }
        },
        error: (error: any) => {
          console.error('Error deleting user:', error);
          alert('Failed to delete user. Please try again.');
        }
      });
    }
  }
}

