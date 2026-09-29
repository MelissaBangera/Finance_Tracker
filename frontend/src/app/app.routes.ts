import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards';
import { HomeComponent } from './pages/home.component';
import { ProfileComponent } from './pages/profile.component';
import { SigninComponent } from './pages/signin.component';
import { SignupComponent } from './pages/signup.component';
import { ForgotPasswordComponent } from './pages/forgot-password.component';

export const routes: Routes = [
  { path: '', component: HomeComponent, canActivate: [authGuard], title: 'Tracker' },
  { path: 'profile', component: ProfileComponent, canActivate: [authGuard], title: 'Profile' },
  { path: 'signin', component: SigninComponent, canActivate: [guestGuard], title: 'Sign in' },
  { path: 'signup', component: SignupComponent, canActivate: [guestGuard], title: 'Create account' },
  { path: 'forgot-password', component: ForgotPasswordComponent, canActivate: [guestGuard], title: 'Reset password' },
  { path: '**', redirectTo: '' },
];
