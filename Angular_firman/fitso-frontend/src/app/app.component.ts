import { Component, OnDestroy } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter, Subject, takeUntil, combineLatest } from 'rxjs';
import { HeaderComponent } from './shared-menu/header/header.component';
import { AuthService } from './services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HeaderComponent],
  template: `
    <app-header *ngIf="showHeader"></app-header>
    <router-outlet></router-outlet>
  `,
})
export class AppComponent implements OnDestroy {
  showHeader = false;
  private destroy$ = new Subject<void>();

  constructor(private router: Router, private auth: AuthService) {
    const route$ = this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    );

    combineLatest([this.auth.isAuthenticated$, route$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([logged]) => {
        const url = this.router.url.split('?')[0];
        const isPublic =
          url === '/' ||
          url === '' ||
          url === '/login' ||
          url === '/register' ||
          url === '/register-type';
        this.showHeader = logged && !isPublic;
      });
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }
}
