import { Component, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { PASSWORD_HINT, PASSWORD_RE, errMsg } from '../core/util';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-shell">
      <aside class="auth-brand">
        <span class="auth-logo">Ledgerly</span>
        <div>
          <h1>Know where your money went.</h1>
          <p>Log income and expenses in seconds, then filter and sort your history whenever you need it.</p>
        </div>
      </aside>
      <main class="auth-main">
        <div class="auth-card">
          @if (step === 1) {
            <h2 class="h3 fw-bold mb-1">Create your account</h2>
            <p class="muted mb-4">We'll email you a code to confirm your address.</p>
            <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
              <div class="mb-3">
                <label class="form-label" for="username">Username</label>
                <input id="username" class="form-control" formControlName="username" autocomplete="username"
                  [class.is-invalid]="bad('username')" />
                <div class="invalid-feedback">3-30 characters: letters, numbers, dot, dash or underscore.</div>
              </div>
              <div class="mb-3">
                <label class="form-label" for="email">Email</label>
                <input id="email" type="email" class="form-control" formControlName="email" autocomplete="email"
                  [class.is-invalid]="bad('email')" />
                <div class="invalid-feedback">Enter a valid email address.</div>
              </div>
              <div class="mb-3">
                <label class="form-label" for="password">Password</label>
                <input id="password" type="password" class="form-control" formControlName="password" autocomplete="new-password"
                  [class.is-invalid]="bad('password')" />
                <div class="form-text" [class.text-danger]="bad('password')">{{ hint }}</div>
              </div>
              @if (error) { <div class="alert alert-danger py-2" role="alert">{{ error }}</div> }
              <button class="btn btn-primary w-100" [disabled]="loading">
                {{ loading ? 'Sending code...' : 'Create account' }}
              </button>
            </form>
            <p class="mt-3 mb-0 text-center">Already have an account? <a routerLink="/signin">Sign in</a></p>
          } @else {
            <h2 class="h3 fw-bold mb-1">Check your email</h2>
            <p class="muted mb-4">Enter the 6-digit code we sent to <strong>{{ form.value.email }}</strong>.</p>
            <form (ngSubmit)="verify()" novalidate>
              <label class="form-label" for="otp">Verification code</label>
              <input id="otp" class="form-control otp-input mb-3" inputmode="numeric" maxlength="6" autocomplete="one-time-code"
                [formControl]="otp" [class.is-invalid]="otp.touched && otp.invalid" />
              @if (error) { <div class="alert alert-danger py-2" role="alert">{{ error }}</div> }
              @if (info) { <div class="alert alert-success py-2" role="status">{{ info }}</div> }
              <button class="btn btn-primary w-100" [disabled]="loading">{{ loading ? 'Verifying...' : 'Verify and continue' }}</button>
            </form>
            <div class="d-flex justify-content-between mt-3">
              <button class="btn btn-link p-0" (click)="resend()" [disabled]="loading">Resend code</button>
              <button class="btn btn-link p-0" (click)="step = 1; error = ''; info = ''">Change email</button>
            </div>
          }
        </div>
      </main>
    </div>
  `,
})
export class SignupComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  hint = `Use ${PASSWORD_HINT}.`;
  step: 1 | 2 = 1;
  loading = false;
  error = '';
  info = '';

  form = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.pattern(/^[\w.-]{3,30}$/)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.pattern(PASSWORD_RE)]],
  });
  otp = this.fb.nonNullable.control('', [Validators.required, Validators.pattern(/^\d{6}$/)]);

  bad(name: 'username' | 'email' | 'password') {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  submit() {
    this.error = '';
    if (this.form.invalid) return this.form.markAllAsTouched();
    this.loading = true;
    this.auth.signup(this.form.getRawValue()).subscribe({
      next: () => { this.loading = false; this.step = 2; },
      error: (e) => { this.loading = false; this.error = errMsg(e); },
    });
  }

  verify() {
    this.error = ''; this.info = '';
    if (this.otp.invalid) return this.otp.markAsTouched();
    this.loading = true;
    this.auth.verifySignup(this.form.getRawValue().email, this.otp.value).subscribe({
      next: () => this.router.navigate(['/']),
      error: (e) => { this.loading = false; this.error = errMsg(e); },
    });
  }

  resend() {
    this.error = ''; this.info = '';
    this.auth.resendOtp(this.form.getRawValue().email, 'signup').subscribe({
      next: () => (this.info = 'A new code is on its way.'),
      error: (e) => (this.error = errMsg(e)),
    });
  }
}
