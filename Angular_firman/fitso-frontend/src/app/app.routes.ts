// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { AuthGuard, ClienteGuard, NutrioloGoGuard } from './guards/auth.guard';

export const routes: Routes = [
  // ====== PÚBLICAS ======
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent),
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register-type',
    loadComponent: () => import('./pages/register-type/register-type.component').then(m => m.RegisterTypeComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register.component').then(m => m.RegisterComponent)
  },

  // ====== CLIENTE ======
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [AuthGuard, ClienteGuard]
  },
  {
    path: 'profile/cliente',
    loadComponent: () => import('./pages/profile-cliente/profile-cliente.component').then(m => m.ProfileClienteComponent),
    canActivate: [AuthGuard, ClienteGuard]
  },
  {
    path: 'progreso',
    loadComponent: () => import('./pages/progreso/progreso.component').then(m => m.ProgresoComponent),
    canActivate: [AuthGuard, ClienteGuard]
  },

  // ====== NUTRIÓLOGO ======
  {
    path: 'nutriologo/dashboard',
    loadComponent: () => import('./pages/nutriologo/nutriologo-dashboard.component').then(m => m.NutriologoDashboardComponent),
    canActivate: [AuthGuard, NutrioloGoGuard]
  },
  {
    path: 'profile/nutriologo',
    loadComponent: () => import('./pages/nutriologo/profile-nutriologo.component').then(m => m.ProfileNutriologoComponent),
    canActivate: [AuthGuard, NutrioloGoGuard]
  },

  // ====== CONTRATOS ======
  {
    path: 'nutriologos',
    loadComponent: () => import('./pages/nutriologos-list/nutriologos-list.component').then(m => m.NutriologosListComponent)
  },
  {
    path: 'nutriologos/:id',
    loadComponent: () => import('./pages/nutriologo/profile-nutriologo.component').then(m => m.ProfileNutriologoComponent)
  },
  {
    path: 'pago-stripe/:id',
    loadComponent: () => import('./pages/pago-stripe/pago-stripe.component').then(m => m.PagoStripeComponent),
    canActivate: [AuthGuard, ClienteGuard]
  },

  // ====== REDIRECCIONES ======
  {
    path: 'dashboard/nutriologo',
    redirectTo: 'nutriologo/dashboard',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: ''
  }
];