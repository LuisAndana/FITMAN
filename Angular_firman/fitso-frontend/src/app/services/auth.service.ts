import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // ✅ URLs separadas para cada módulo
  private usersUrl = 'http://127.0.0.1:8081/users';
  private authUrl = 'http://127.0.0.1:8081/auth';

  constructor(private http: HttpClient) {}

  // 🔹 Registro de usuario (usa /users/register)
  register(data: {
    nombre: string;
    correo: string;
    contrasena: string;
    edad: number;
    peso: number;
    altura: number;
    objetivo: string;
  }): Observable<any> {
    return this.http.post(`${this.usersUrl}/register`, data);
  }

  // 🔹 Inicio de sesión (usa /auth/login)
  login(data: { correo: string; contrasena: string }): Observable<any> {
    return this.http.post(`${this.authUrl}/login`, data);
  }

  // 🔹 Guardar token localmente
  saveToken(token: string): void {
    localStorage.setItem('token', token);
  }

  // 🔹 Obtener token
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  // 🔹 Cerrar sesión
  logout(): void {
    localStorage.removeItem('token');
  }
}
