import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { RegisterComponent } from './pages/register/register.component';
import { RegisterTypeComponent } from './pages/register-type/register-type.component';
import { LoginComponent } from './pages/login/login.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { ProfileClienteComponent } from './pages/profile-cliente/profile-cliente.component';
import { ProgresoComponent } from './pages/progreso/progreso.component';
import { NutriologoDashboardComponent } from './pages/nutriologo/nutriologo-dashboard.component';
import { ProfileNutriologoComponent } from './pages/nutriologo/profile-nutriologo.component';
import { AuthGuard, ClienteGuard, NutrioloGoGuard } from './guards/auth.guard';

export const routes: Routes = [
  // Públicas
  { path: '', component: HomeComponent, pathMatch: 'full' },
  { path: 'register-type', component: RegisterTypeComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'login', component: LoginComponent },

  // Cliente
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [AuthGuard, ClienteGuard],
  },
  {
    path: 'profile/cliente',
    component: ProfileClienteComponent,
    canActivate: [AuthGuard, ClienteGuard],
  },
  {
    path: 'progreso',
    component: ProgresoComponent,
    canActivate: [AuthGuard, ClienteGuard],
  },

  // Nutriólogo
  {
    path: 'nutriologo/dashboard',
    component: NutriologoDashboardComponent,
    canActivate: [AuthGuard, NutrioloGoGuard],
  },
  {
    path: 'profile/nutriologo',
    component: ProfileNutriologoComponent,
    canActivate: [AuthGuard, NutrioloGoGuard],
  },
  // compatibilidad con la ruta vieja por si quedó en algún lugar
  {
    path: 'dashboard/nutriologo',
    pathMatch: 'full',
    redirectTo: 'nutriologo/dashboard',
  },

  {
    path: 'nutriologos',
    loadComponent: () => import('./pages/nutriologos-list/nutriologos-list.component')
      .then(m => m.NutriologosListComponent)
  },
  {
    path: 'nutriologos/:id',
    loadComponent: () => import('./pages/nutriologo-detail/nutriologo-detail.component')
      .then(m => m.NutriologoDetailComponent)
  },

  // ⬇️ SIEMPRE AL FINAL
  { path: '**', redirectTo: '' },

  
];
