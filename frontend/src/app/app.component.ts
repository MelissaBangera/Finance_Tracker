import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    @if (showNav) {
      <nav class="navbar navbar-expand-sm bg-white border-bottom">
        <div class="container">
          <a class="navbar-brand fw-bold" routerLink="/">Ledgerly</a>
          <button class="navbar-toggler" type="button" aria-label="Toggle menu" (click)="open = !open">
            <span class="navbar-toggler-icon"></span>
          </button>
          <div class="navbar-collapse" [class.collapse]="!open" [class.show]="open">
            <ul class="navbar-nav me-auto">
              <li class="nav-item">
                <a class="nav-link" routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" (click)="open = false">Tracker</a>
              </li>
              <li class="nav-item">
                <a class="nav-link" routerLink="/profile" routerLinkActive="active" (click)="open = false">Profile</a>
              </li>
            </ul>
            <button class="btn btn-outline-primary btn-sm" (click)="auth.logout()">Log out</button>
          </div>
        </div>
      </nav>
    }
    <router-outlet />
  `,
})
export class AppComponent {
  auth = inject(AuthService);
  private router = inject(Router);
  open = false;

  get showNav() {
    return this.auth.isLoggedIn && !/^\/(signin|signup|forgot-password)/.test(this.router.url);
  }
}
