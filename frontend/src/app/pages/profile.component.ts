import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AbstractControl, FormBuilder, FormsModule, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { AuthService, User } from '../core/auth.service';
import { PASSWORD_HINT, PASSWORD_RE, errMsg } from '../core/util';

const match = (g: AbstractControl): ValidationErrors | null =>
  g.get('newPassword')?.value === g.get('confirm')?.value ? null : { mismatch: true };

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, DatePipe],
  template: `
    <div class="container py-4" style="max-width: 40rem">
      <h1 class="h3 fw-bold mb-3">Profile</h1>

      @if (loadError) { <div class="alert alert-danger" role="alert">{{ loadError }}</div> }

      @if (user) {
        <section class="panel mb-4" aria-label="Account details">
          <form (ngSubmit)="saveName()" novalidate>
            <div class="mb-3">
              <label class="form-label" for="username">Username</label>
              <div class="input-group">
                <input id="username" class="form-control" [formControl]="username" [class.is-invalid]="username.invalid && username.touched" />
                <button class="btn btn-outline-primary" [disabled]="username.pristine || savingName">{{ savingName ? 'Saving...' : 'Save' }}</button>
                <div class="invalid-feedback">3-30 characters: letters, numbers, dot, dash or underscore.</div>
              </div>
            </div>
          </form>
          <div class="mb-3">
            <label class="form-label" for="email">Email</label>
            <input id="email" class="form-control" [value]="user.email" readonly />
          </div>
          <div class="mb-3">
            <label class="form-label" for="pw">Password</label>
            <input id="pw" class="form-control" value="••••••••" readonly aria-label="Password (hidden)" />
          </div>
          @if (user.createdAt) { <p class="muted small mb-2">Member since {{ user.createdAt | date: 'mediumDate' }}</p> }
          @if (nameMsg) { <div class="alert alert-success py-2 mb-0" role="status">{{ nameMsg }}</div> }
          @if (nameErr) { <div class="alert alert-danger py-2 mb-0" role="alert">{{ nameErr }}</div> }
        </section>

        <section class="panel mb-4" aria-label="Change password">
          <h2 class="h5 fw-bold mb-3">Change password</h2>

          @if (pwStep === 0) {
            <button class="btn btn-outline-primary" (click)="pwStep = 1">Change password</button>
            @if (pwDone) { <div class="alert alert-success py-2 mt-3 mb-0" role="status">{{ pwDone }}</div> }
          }

          @if (pwStep === 1) {
            <form (ngSubmit)="requestCode()" novalidate>
              <p class="muted">Confirm your current password and we'll email you a code.</p>
              <label class="form-label" for="cur">Current password</label>
              <input id="cur" type="password" class="form-control mb-3" [formControl]="current" autocomplete="current-password"
                [class.is-invalid]="current.invalid && current.touched" />
              @if (pwErr) { <div class="alert alert-danger py-2" role="alert">{{ pwErr }}</div> }
              <div class="d-flex gap-2">
                <button class="btn btn-primary" [disabled]="pwBusy">{{ pwBusy ? 'Sending...' : 'Send code' }}</button>
                <button type="button" class="btn btn-outline-primary" (click)="cancelPw()">Cancel</button>
              </div>
            </form>
          }

          @if (pwStep === 2) {
            <form [formGroup]="pwForm" (ngSubmit)="confirmChange()" novalidate>
              <p class="muted">Enter the code sent to <strong>{{ user.email }}</strong> and choose a new password.</p>
              <div class="mb-3">
                <label class="form-label" for="otp">Verification code</label>
                <input id="otp" class="form-control otp-input" inputmode="numeric" maxlength="6" formControlName="otp"
                  [class.is-invalid]="pwForm.controls.otp.touched && pwForm.controls.otp.invalid" />
              </div>
              <div class="mb-3">
                <label class="form-label" for="np">New password</label>
                <input id="np" type="password" class="form-control" formControlName="newPassword" autocomplete="new-password"
                  [class.is-invalid]="pwForm.controls.newPassword.touched && pwForm.controls.newPassword.invalid" />
                <div class="form-text">Use {{ hint }}.</div>
              </div>
              <div class="mb-3">
                <label class="form-label" for="cp">Confirm new password</label>
                <input id="cp" type="password" class="form-control" formControlName="confirm" autocomplete="new-password"
                  [class.is-invalid]="pwForm.controls.confirm.touched && pwForm.hasError('mismatch')" />
                <div class="invalid-feedback">Passwords don't match.</div>
              </div>
              @if (pwErr) { <div class="alert alert-danger py-2" role="alert">{{ pwErr }}</div> }
              <div class="d-flex gap-2">
                <button class="btn btn-primary" [disabled]="pwBusy">{{ pwBusy ? 'Saving...' : 'Save new password' }}</button>
                <button type="button" class="btn btn-outline-primary" (click)="cancelPw()">Cancel</button>
              </div>
            </form>
          }
        </section>

        <button class="btn btn-outline-danger" (click)="auth.logout()">Log out</button>
      }
    </div>
  `,
})
export class ProfileComponent implements OnInit {
  auth = inject(AuthService);
  private fb = inject(FormBuilder);

  hint = PASSWORD_HINT;
  user: User | null = null;
  loadError = '';

  username = this.fb.nonNullable.control('', [Validators.required, Validators.pattern(/^[\w.-]{3,30}$/)]);
  savingName = false;
  nameMsg = '';
  nameErr = '';

  pwStep: 0 | 1 | 2 = 0;
  pwBusy = false;
  pwErr = '';
  pwDone = '';
  current = this.fb.nonNullable.control('', Validators.required);
  pwForm = this.fb.nonNullable.group(
    {
      otp: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
      newPassword: ['', [Validators.required, Validators.pattern(PASSWORD_RE)]],
      confirm: ['', Validators.required],
    },
    { validators: match }
  );

  ngOnInit() {
    this.auth.me().subscribe({
      next: (r) => { this.user = r.user; this.username.setValue(r.user.username); this.username.markAsPristine(); },
      error: (e) => (this.loadError = errMsg(e)),
    });
  }

  saveName() {
    this.nameMsg = ''; this.nameErr = '';
    if (this.username.invalid) return this.username.markAsTouched();
    this.savingName = true;
    this.auth.updateUsername(this.username.value).subscribe({
      next: (r) => { this.savingName = false; this.user = r.user; this.username.markAsPristine(); this.nameMsg = 'Username updated.'; },
      error: (e) => { this.savingName = false; this.nameErr = errMsg(e); },
    });
  }

  requestCode() {
    this.pwErr = '';
    if (this.current.invalid) return this.current.markAsTouched();
    this.pwBusy = true;
    this.auth.requestPasswordChange(this.current.value).subscribe({
      next: () => { this.pwBusy = false; this.pwStep = 2; },
      error: (e) => { this.pwBusy = false; this.pwErr = errMsg(e); },
    });
  }

  confirmChange() {
    this.pwErr = '';
    if (this.pwForm.invalid) return this.pwForm.markAllAsTouched();
    this.pwBusy = true;
    const { otp, newPassword } = this.pwForm.getRawValue();
    this.auth.confirmPasswordChange(this.current.value, otp, newPassword).subscribe({
      next: () => { this.pwBusy = false; this.cancelPw(); this.pwDone = 'Password changed.'; },
      error: (e) => { this.pwBusy = false; this.pwErr = errMsg(e); },
    });
  }

  cancelPw() {
    this.pwStep = 0; this.pwErr = ''; this.pwDone = '';
    this.current.reset(''); this.pwForm.reset({ otp: '', newPassword: '', confirm: '' });
  }
}
