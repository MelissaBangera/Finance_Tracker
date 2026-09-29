import { Component, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { errMsg } from '../core/util';

@Component({
  selector: 'app-signin',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-shell">
      <aside class="auth-brand">
        <span class="auth-logo">Ledgerly</span>
        <div>
          <h1>Welcome back.</h1>
          <p>Pick up where you left off: your transactions are right where you saved them.</p>
        </div>
      </aside>
      <main class="auth-main">
        <div class="auth-card">
          @if (step === 'credentials') {
            <h2 class="h3 fw-bold mb-4">Sign in</h2>
            <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
              <div class="mb-3">
                <label class="form-label" for="email">Email</label>
                <input id="email" type="email" class="form-control" formControlName="email" autocomplete="email"
                  [class.is-invalid]="form.controls.email.touched && form.controls.email.invalid" />
                <div class="invalid-feedback">Enter a valid email address.</div>
              </div>
              <div class="mb-2">
                <label class="form-label" for="password">Password</label>
                <input id="password" type="password" class="form-control" formControlName="password" autocomplete="current-password"
                  [class.is-invalid]="form.controls.password.touched && form.controls.password.invalid" />
                <div class="invalid-feedback">Enter your password.</div>
              </div>
              <div class="mb-3 text-end"><a routerLink="/forgot-password">Forgot password?</a></div>
              @if (error) { <div class="alert alert-danger py-2" role="alert">{{ error }}</div> }
              <button class="btn btn-primary w-100" [disabled]="loading">{{ loading ? 'Signing in...' : 'Sign in' }}</button>
            </form>
            <p class="mt-3 mb-0 text-center">New here? <a routerLink="/signup">Create an account</a></p>
          } @else {
            <h2 class="h3 fw-bold mb-1">Enter your code</h2>
            <p class="muted mb-4">We sent a 6-digit code to <strong>{{ form.value.email }}</strong>.</p>
            <form (ngSubmit)="verify()" novalidate>
              <label class="form-label" for="otp">Verification code</label>
              <input id="otp" class="form-control otp-input mb-3" inputmode="numeric" maxlength="6" autocomplete="one-time-code"
                [formControl]="otp" [class.is-invalid]="otp.touched && otp.invalid" />
              @if (error) { <div class="alert alert-danger py-2" role="alert">{{ error }}</div> }
              @if (info) { <div class="alert alert-success py-2" role="status">{{ info }}</div> }
              <button class="btn btn-primary w-100" [disabled]="loading">{{ loading ? 'Verifying...' : 'Verify and sign in' }}</button>
            </form>
            <div class="d-flex justify-content-between mt-3">
              <button class="btn btn-link p-0" (click)="resend()">Resend code</button>
              <button class="btn btn-link p-0" (click)="back()">Back</button>
            </div>
          }
        </div>
      </main>
    </div>
  `,
})
export class SigninComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  step: 'credentials' | 'verify-signin' | 'verify-signup' = 'credentials';
  loading = false;
  error = '';
  info = '';

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
  otp = this.fb.nonNullable.control('', [Validators.required, Validators.pattern(/^\d{6}$/)]);

  submit() {
    this.error = '';
    if (this.form.invalid) return this.form.markAllAsTouched();
    this.loading = true;
    const { email, password } = this.form.getRawValue();
    this.auth.signin(email, password).subscribe({
      next: (r) => {
        this.loading = false;
        if (r.step === 'done') this.router.navigate(['/']);
        else this.step = r.step;
      },
      error: (e) => { this.loading = false; this.error = errMsg(e); },
    });
  }

  verify() {
    this.error = ''; this.info = '';
    if (this.otp.invalid) return this.otp.markAsTouched();
    this.loading = true;
    const email = this.form.getRawValue().email;
    const call = this.step === 'verify-signup' ? this.auth.verifySignup(email, this.otp.value) : this.auth.verifySignin(email, this.otp.value);
    call.subscribe({
      next: () => this.router.navigate(['/']),
      error: (e) => { this.loading = false; this.error = errMsg(e); },
    });
  }

  resend() {
    this.error = ''; this.info = '';
    const purpose = this.step === 'verify-signup' ? 'signup' : 'signin';
    this.auth.resendOtp(this.form.getRawValue().email, purpose).subscribe({
      next: () => (this.info = 'A new code is on its way.'),
      error: (e) => (this.error = errMsg(e)),
    });
  }

  back() {
    this.step = 'credentials'; this.otp.reset(''); this.error = ''; this.info = '';
  }
}
