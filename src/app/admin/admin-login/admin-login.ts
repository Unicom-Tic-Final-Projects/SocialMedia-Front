import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { LoginRequest } from '../../models/auth.models';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: './admin-login.html',
  styleUrl: './admin-login.css',
})
export class AdminLogin {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  loginForm: FormGroup;
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.markFormGroupTouched(this.loginForm);
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const loginRequest: LoginRequest = {
      email: this.loginForm.value.email,
      password: this.loginForm.value.password,
    };

    this.authService.login(loginRequest).subscribe({
      next: (response) => {
        if (response.success) {
          // Check if user is admin
          const user = this.authService.user();
          const isAdmin = user?.role?.toLowerCase().includes('admin') || 
                         user?.role?.toLowerCase() === 'owner' ||
                         user?.role?.toLowerCase() === 'administrator';
          
          if (isAdmin) {
            // Get return URL from query params or default to admin overview
            const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/admin/overview';
            this.router.navigate([returnUrl]);
          } else {
            this.errorMessage.set('Access denied. Admin access required.');
            this.authService.logout();
          }
        } else {
          this.errorMessage.set(response.message || 'Login failed. Please try again.');
        }
        this.loading.set(false);
      },
      error: (error) => {
        const message = error?.userMessage || error?.message || 'An error occurred during login.';
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

  get email() {
    return this.loginForm.get('email');
  }

  get password() {
    return this.loginForm.get('password');
  }
}

