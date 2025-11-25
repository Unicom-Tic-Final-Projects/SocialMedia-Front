import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { LoginRequest, RegisterRequest } from '../../models/auth.models';

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
  registerForm: FormGroup;
  loading = signal(false);
  errorMessage = signal<string | null>(null);
  isSignupMode = signal(false);
  strengthLevel = signal(0);
  passwordMismatch = signal(false);

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });

    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      tenantName: ['', [Validators.required, Validators.minLength(2)]],
      tenantType: ['Individual', [Validators.required]],
      acceptTerms: [false, [Validators.requiredTrue]],
    }, {
      validators: [this.passwordMatchValidator]
    });

    // Watch password changes for strength and mismatch
    this.registerForm.get('password')?.valueChanges.subscribe(() => {
      this.checkStrength();
      this.checkPasswordMatch();
    });
    this.registerForm.get('confirmPassword')?.valueChanges.subscribe(() => {
      this.checkPasswordMatch();
    });
  }

  toggleMode(): void {
    // Reset animations by toggling the mode
    const newMode = !this.isSignupMode();
    this.errorMessage.set(null);
    
    // Force reflow to restart animations
    const imageSection = document.querySelector('.auth-image-section') as HTMLElement;
    const formSection = document.querySelector('.auth-form-section') as HTMLElement;
    
    if (imageSection) {
      imageSection.style.animation = 'none';
      void imageSection.offsetWidth; // Trigger reflow
    }
    
    if (formSection) {
      formSection.style.animation = 'none';
      void formSection.offsetWidth; // Trigger reflow
    }
    
    // Now toggle the mode and restart animations
    setTimeout(() => {
      this.isSignupMode.set(newMode);
      
      // Restart animations after a tiny delay
      setTimeout(() => {
        if (imageSection) {
          imageSection.style.animation = '';
        }
        if (formSection) {
          formSection.style.animation = '';
        }
      }, 50);
    }, 10);
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (!password || !confirmPassword) {
      return null;
    }

    return password.value === confirmPassword.value ? null : { passwordMismatch: true };
  }

  strengthlevel: number = 0;

  checkStrength() {
    const value = this.registerForm.get('password')?.value || '';

    let score = 0;

    if (value.length >= 6) score++;
    if (/[A-Z]/.test(value)) score++;
    if (/[0-9]/.test(value) || /[^A-Za-z0-9]/.test(value)) score++;

    this.strengthlevel = score;
  }

  checkPasswordMatch(): void {
    const password = this.registerForm.get('password')?.value;
    const confirmPassword = this.registerForm.get('confirmPassword')?.value;
    this.passwordMismatch.set(password && confirmPassword && password !== confirmPassword);
  }

  onRegisterSubmit(): void {
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
    };

    this.authService.register(registerRequest).subscribe({
      next: (response) => {
        this.loading.set(false);
        if (response.success && response.data) {
          const responseTenantType = response.data.user?.tenantType;
          const navigateForTenant = (tenantType?: 'Agency' | 'Individual' | 'System') => {
            let targetRoute = '/dashboard';
            if (tenantType === 'Agency') {
              targetRoute = '/agency';
            } else if (tenantType === 'System') {
              targetRoute = '/admin';
            }
            this.router.navigateByUrl(targetRoute);
          };

          if (responseTenantType) {
            navigateForTenant(responseTenantType);
          } else {
            this.authService.loadCurrentUser().subscribe((user) => {
              navigateForTenant(user?.tenantType);
            });
          }
        } else {
          this.errorMessage.set(response.message || 'Registration failed. Please try again.');
        }
      },
      error: (error) => {
        this.loading.set(false);
        let message = 'An error occurred during registration.';
        if (error?.error?.message) {
          message = error.error.message;
        } else if (error?.error?.errors && Array.isArray(error.error.errors)) {
          message = error.error.errors.join(', ');
        } else if (error?.message) {
          message = error.message;
        }
        this.errorMessage.set(message);
      },
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
        console.log('[LoginPage] Login response received:', response);
        if (response && response.success) {
          const returnUrl: string | undefined = this.route.snapshot.queryParams['returnUrl'];
          const responseTenantType = response.data?.user?.tenantType;

          const handleNavigation = (tenantType?: 'Agency' | 'Individual' | 'System', userRole?: string) => {
            if (tenantType === 'System') {
              this.router.navigateByUrl('/admin');
              return;
            }

            // Check if user is a team member (Editor or Admin in Agency tenant)
            const isTeamMember = tenantType === 'Agency' && (userRole === 'Editor' || userRole === 'Admin');
            
            if (isTeamMember) {
              this.router.navigateByUrl(returnUrl ?? '/team');
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
            handleNavigation(responseTenantType, response.data?.user?.role);
          } else {
            this.authService.loadCurrentUser().subscribe((user) => {
              handleNavigation(user?.tenantType, user?.role);
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
    return this.isSignupMode() ? this.registerForm.get('email') : this.loginForm.get('email');
  }

  get password() {
    return this.isSignupMode() ? this.registerForm.get('password') : this.loginForm.get('password');
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
}
