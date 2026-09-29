import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';

export interface User {
  id: string;
  username: string;
  email: string;
  createdAt?: string;
}
export interface Session {
  token: string;
  user: User;
}
export interface SigninResponse extends Partial<Session> {
  step: 'verify-signin' | 'verify-signup' | 'done';
  message?: string;
}
export type OtpPurpose = 'signup' | 'signin' | 'reset';

const KEY = 'ft_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  get token(): string | null {
    return localStorage.getItem(KEY);
  }
  get isLoggedIn(): boolean {
    return !!this.token;
  }

  private store = (s: Session) => localStorage.setItem(KEY, s.token);

  signup(body: { username: string; email: string; password: string }) {
    return this.http.post<{ message: string }>('/api/auth/signup', body);
  }
  verifySignup(email: string, otp: string) {
    return this.http.post<Session>('/api/auth/verify-signup', { email, otp }).pipe(tap(this.store));
  }
  signin(email: string, password: string) {
    return this.http
      .post<SigninResponse>('/api/auth/signin', { email, password })
      .pipe(tap((r) => r.step === 'done' && r.token && this.store(r as Session)));
  }
  verifySignin(email: string, otp: string) {
    return this.http.post<Session>('/api/auth/verify-signin', { email, otp }).pipe(tap(this.store));
  }
  forgotPassword(email: string) {
    return this.http.post<{ message: string }>('/api/auth/forgot-password', { email });
  }
  resetPassword(email: string, otp: string, newPassword: string) {
    return this.http.post<{ message: string }>('/api/auth/reset-password', { email, otp, newPassword });
  }
  resendOtp(email: string, purpose: OtpPurpose) {
    return this.http.post<{ message: string }>('/api/auth/resend-otp', { email, purpose });
  }

  me() {
    return this.http.get<{ user: User }>('/api/user/me');
  }
  updateUsername(username: string) {
    return this.http.put<{ user: User }>('/api/user/me', { username });
  }
  requestPasswordChange(currentPassword: string) {
    return this.http.post<{ message: string }>('/api/user/change-password/request', { currentPassword });
  }
  confirmPasswordChange(currentPassword: string, otp: string, newPassword: string) {
    return this.http.post<{ message: string }>('/api/user/change-password/confirm', { currentPassword, otp, newPassword });
  }

  logout() {
    localStorage.removeItem(KEY);
    this.router.navigate(['/signin']);
  }
}
