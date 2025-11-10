import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { RegisterRequest } from '../../models/auth.models';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: './register-page.html',
  styleUrl: './register-page.css',
})
export class RegisterPage {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  registerForm: FormGroup;
  loading = signal(false);
  errorMessage = signal<string | null>(null);
  selectedTenantType = signal<'Individual' | 'Agency'>('Individual');

  constructor() {
    this.registerForm = this.fb.group({
      userName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      tenantName: ['', [Validators.required, Validators.minLength(2)]],
      tenantType: ['Individual', [Validators.required]],
      acceptTerms: [false, [Validators.requiredTrue]],
    }, {
      validators: [this.passwordMatchValidator]
    });
  }

  /**
   * Custom validator to check if passwords match
   */
  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (!password || !confirmPassword) {
      return null;
    }

    return password.value === confirmPassword.value ? null : { passwordMismatch: true };
  }

  /**
   * Handle tenant type change
   */
  onTenantTypeChange(type: 'Individual' | 'Agency'): void {
    this.selectedTenantType.set(type);
    this.registerForm.patchValue({ tenantType: type });
    
    // Update tenant name placeholder based on type
    const tenantNameControl = this.registerForm.get('tenantName');
    if (tenantNameControl) {
      tenantNameControl.updateValueAndValidity();
    }
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.markFormGroupTouched(this.registerForm);
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const formValue = this.registerForm.value;
    const registerRequest: RegisterRequest = {
      email: formValue.email,
      password: formValue.password,
      tenantName: formValue.tenantName,
      tenantType: formValue.tenantType,
      userName: formValue.userName,
    };

    this.authService.register(registerRequest).subscribe({
      next: (response) => {
        if (response.success) {
          // Registration successful, redirect to dashboard
          this.router.navigate(['/dashboard']);
        } else {
          this.errorMessage.set(response.message || 'Registration failed. Please try again.');
        }
        this.loading.set(false);
      },
      error: (error) => {
        let message = 'An error occurred during registration.';
        
        if (error?.userMessage) {
          message = error.userMessage;
        } else if (error?.message) {
          message = error.message;
        } else if (error?.errors && Array.isArray(error.errors)) {
          message = error.errors.join(', ');
        }
        
        this.errorMessage.set(message);
        this.loading.set(false);
      },
    });
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach((key) => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  // Getters for form controls
  get userName() {
    return this.registerForm.get('userName');
  }

  get email() {
    return this.registerForm.get('email');
  }

  get password() {
    return this.registerForm.get('password');
  }

  get confirmPassword() {
    return this.registerForm.get('confirmPassword');
  }

  get tenantName() {
    return this.registerForm.get('tenantName');
  }

  get tenantType() {
    return this.registerForm.get('tenantType');
  }

  get acceptTerms() {
    return this.registerForm.get('acceptTerms');
  }

  get passwordMismatch() {
    return this.registerForm.errors?.['passwordMismatch'] && 
           this.confirmPassword?.touched;
  }
}
