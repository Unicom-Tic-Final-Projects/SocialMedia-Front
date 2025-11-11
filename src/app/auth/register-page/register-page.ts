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

  constructor() {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      tenantName: ['', [Validators.required, Validators.minLength(2)]],
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
      // tenantType is optional - backend will default to 'Individual' for end users
    };

    console.log('Registering with request:', registerRequest);

    this.authService.register(registerRequest).subscribe({
      next: (response) => {
        this.loading.set(false);
        if (response.success && response.data) {
          // Registration successful, redirect to dashboard
          this.router.navigate(['/dashboard']);
        } else {
          // Registration failed - show error and stay on page
          this.errorMessage.set(response.message || 'Registration failed. Please try again.');
        }
      },
      error: (error) => {
        this.loading.set(false);
        console.error('Registration error details:', error);
        
        let message = 'An error occurred during registration.';
        
        // Extract error message from API response
        if (error?.error?.message) {
          message = error.error.message;
        } else if (error?.error?.errors && Array.isArray(error.error.errors)) {
          message = error.error.errors.join(', ');
        } else if (error?.error?.data?.message) {
          message = error.error.data.message;
        } else if (error?.message) {
          message = error.message;
        } else if (error?.userMessage) {
          message = error.userMessage;
        }
        
        this.errorMessage.set(message);
        // Do NOT navigate - stay on registration page to show error
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

  get acceptTerms() {
    return this.registerForm.get('acceptTerms');
  }

  get passwordMismatch() {
    return this.registerForm.errors?.['passwordMismatch'] && 
           this.confirmPassword?.touched;
  }
}
