import { Component, inject } from '@angular/core';
import { AbstractControl, FormBuilder, FormsModule, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { PASSWORD_HINT, PASSWORD_RE, errMsg } from '../core/util';

const match = (g: AbstractControl): ValidationErrors | null =>
  g.get('newPassword')?.value === g.get('confirm')?.value ? null : { mismatch: true };

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-shell">
      <aside class="auth-brand">
        <span class="auth-logo">Ledgerly</span>
        <div>
          <h1>Locked out? It happens.</h1>
          <p>We'll email a one-time code so you can set a new password.</p>
        </div>
      </aside>
      <main class="auth-main">
        <div class="auth-card">
          @if (step === 1) {
            <h2 class="h3 fw-bold mb-1">Reset your password</h2>
            <p class="muted mb-4">Enter the email you signed up with.</p>
            <form (ngSubmit)="sendCode()" novalidate>
              <label class="form-label" for="email">Email</label>
              <input id="email" type="email" class="form-control mb-3" [formControl]="email" autocomplete="email"
                [class.is-invalid]="email.touched && email.invalid" />
              @if (error) { <div class="alert alert-danger py-2" role="alert">{{ error }}</div> }
              <button class="btn btn-primary w-100" [disabled]="loading">{{ loading ? 'Sending...' : 'Send code' }}</button>
            </form>
          } @else {
            <h2 class="h3 fw-bold mb-1">Set a new password</h2>
            <p class="muted mb-4">Enter the code sent to <strong>{{ email.value }}</strong> and choose a new password.</p>
            <form [formGroup]="form" (ngSubmit)="reset()" novalidate>
              <div class="mb-3">
                <label class="form-label" for="otp">Verification code</label>
                <input id="otp" class="form-control otp-input" inputmode="numeric" maxlength="6" autocomplete="one-time-code"
                  formControlName="otp" [class.is-invalid]="form.controls.otp.touched && form.controls.otp.invalid" />
              </div>
              <div class="mb-3">
                <label class="form-label" for="np">New password</label>
                <input id="np" type="password" class="form-control" formControlName="newPassword" autocomplete="new-password"
                  [class.is-invalid]="form.controls.newPassword.touched && form.controls.newPassword.invalid" />
                <div class="form-text">Use {{ hint }}.</div>
              </div>
              <div class="mb-3">
                <label class="form-label" for="cp">Confirm password</label>
                <input id="cp" type="password" class="form-control" formControlName="confirm" autocomplete="new-password"
                  [class.is-invalid]="form.controls.confirm.touched && form.hasError('mismatch')" />
                <div class="invalid-feedback">Passwords don't match.</div>
              </div>
              @if (error) { <div class="alert alert-danger py-2" role="alert">{{ error }}</div> }
              @if (info) { <div class="alert alert-success py-2" role="status">{{ info }}</div> }
              <button class="btn btn-primary w-100" [disabled]="loading">{{ loading ? 'Saving...' : 'Save new password' }}</button>
            </form>
            <button class="btn btn-link p-0 mt-3" (click)="resend()">Resend code</button>
          }
          <p class="mt-3 mb-0 text-center"><a routerLink="/signin">Back to sign in</a></p>
        </div>
      </main>
    </div>
  `,
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  hint = PASSWORD_HINT;
  step: 1 | 2 = 1;
  loading = false;
  error = '';
  info = '';

  email = this.fb.nonNullable.control('', [Validators.required, Validators.email]);
  form = this.fb.nonNullable.group(
    {
      otp: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
      newPassword: ['', [Validators.required, Validators.pattern(PASSWORD_RE)]],
      confirm: ['', Validators.required],
    },
    { validators: match }
  );

  sendCode() {
    this.error = '';
    if (this.email.invalid) return this.email.markAsTouched();
    this.loading = true;
    this.auth.forgotPassword(this.email.value).subscribe({
      next: () => { this.loading = false; this.step = 2; },
      error: (e) => { this.loading = false; this.error = errMsg(e); },
    });
  }

  reset() {
    this.error = ''; this.info = '';
    if (this.form.invalid) return this.form.markAllAsTouched();
    this.loading = true;
    const { otp, newPassword } = this.form.getRawValue();
    this.auth.resetPassword(this.email.value, otp, newPassword).subscribe({
      next: () => this.router.navigate(['/signin']),
      error: (e) => { this.loading = false; this.error = errMsg(e); },
    });
  }

  resend() {
    this.error = ''; this.info = '';
    this.auth.resendOtp(this.email.value, 'reset').subscribe({
      next: () => (this.info = 'If that email is registered, a new code is on its way.'),
      error: (e) => (this.error = errMsg(e)),
    });
  }
}
