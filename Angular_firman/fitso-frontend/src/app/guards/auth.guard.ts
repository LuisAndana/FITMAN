import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(
    _route: ActivatedRouteSnapshot,
    _state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | boolean | UrlTree {
    const token = this.auth.getToken();
    if (!token) return this.router.parseUrl('/login');
    return true;
  }
}

@Injectable({ providedIn: 'root' })
export class ClienteGuard implements CanActivate {
  constructor(private router: Router, private auth: AuthService) {}

  canActivate(
    _route: ActivatedRouteSnapshot,
    _state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | boolean | UrlTree {
    const tipoLocal = localStorage.getItem('tipoUsuario');
    const token = this.auth.getToken();

    if (tipoLocal) {
      if (tipoLocal === 'cliente') return true;
      if (tipoLocal === 'nutriologo') return this.router.parseUrl('/profile/nutriologo');
      return this.router.parseUrl('/login');
    }

    if (!token) return this.router.parseUrl('/login');

    return this.auth.getCurrentUser().pipe(
      map((me: any) => {
        const tipo = me?.tipo_usuario ?? null;
        const id   = me?.id_usuario ?? me?.id ?? null;

        if (tipo) localStorage.setItem('tipoUsuario', tipo);
        if (id)   localStorage.setItem('usuarioId', String(id));
        if (me?.correo) localStorage.setItem('correoUsuario', me.correo);

        if (tipo === 'cliente') return true;
        if (tipo === 'nutriologo') return this.router.parseUrl('/profile/nutriologo');
        return this.router.parseUrl('/login');
      }),
      catchError(() => of(this.router.parseUrl('/login')))
    );
  }
}

@Injectable({ providedIn: 'root' })
export class NutrioloGoGuard implements CanActivate {
  constructor(private router: Router, private auth: AuthService) {}

  canActivate(
    _route: ActivatedRouteSnapshot,
    _state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | boolean | UrlTree {
    const tipoLocal = localStorage.getItem('tipoUsuario');
    const token = this.auth.getToken();

    if (tipoLocal) {
      if (tipoLocal === 'nutriologo') return true;
      if (tipoLocal === 'cliente') return this.router.parseUrl('/dashboard');
      return this.router.parseUrl('/login');
    }

    if (!token) return this.router.parseUrl('/login');

    return this.auth.getCurrentUser().pipe(
      map((me: any) => {
        const tipo = me?.tipo_usuario ?? null;
        const id   = me?.id_usuario ?? me?.id ?? null;

        if (tipo) localStorage.setItem('tipoUsuario', tipo);
        if (id)   localStorage.setItem('usuarioId', String(id));
        if (me?.correo) localStorage.setItem('correoUsuario', me.correo);

        if (tipo === 'nutriologo') return true;
        if (tipo === 'cliente') return this.router.parseUrl('/dashboard');
        return this.router.parseUrl('/login');
      }),
      catchError(() => of(this.router.parseUrl('/login')))
    );
  }
}
