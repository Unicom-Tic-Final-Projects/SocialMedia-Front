import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { LoginRequest } from '../../models/auth.models';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: './login-page.html',
  styleUrl: './login-page.css',
})
export class LoginPage {
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
          const returnUrl: string | undefined = this.route.snapshot.queryParams['returnUrl'];
          const responseTenantType = response.data?.user?.tenantType;

          const handleNavigation = (tenantType?: 'Agency' | 'Individual' | 'System') => {
            if (tenantType === 'System') {
              this.router.navigateByUrl('/admin');
              return;
            }

            const isAgency = tenantType === 'Agency';
            let targetRoute = returnUrl ?? (isAgency ? '/agency' : '/dashboard');

            if (isAgency && (!returnUrl || returnUrl.startsWith('/dashboard'))) {
              targetRoute = '/agency';
            }

            this.router.navigateByUrl(targetRoute);
          };

          if (responseTenantType) {
            handleNavigation(responseTenantType);
          } else {
            this.authService.loadCurrentUser().subscribe((user) => {
              handleNavigation(user?.tenantType);
            });
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
