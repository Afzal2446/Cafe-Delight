import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface Owner {
  id: number;
  name?: string;
  email: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private baseUrl = '/api/auth';
  private tokenKey = 'owner_token';
  private ownerKey = 'owner_info';

  constructor(private http: HttpClient) {}

  signup(name: string, email: string, password: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/signup`, { name, email, password })
      .pipe(tap((res: any) => this.storeSession(res)));
  }

  login(email: string, password: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/login`, { email, password })
      .pipe(tap((res: any) => this.storeSession(res)));
  }

  private storeSession(res: any) {
    if (res?.token) {
      localStorage.setItem(this.tokenKey, res.token);
      localStorage.setItem(this.ownerKey, JSON.stringify(res.owner || {}));
    }
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.ownerKey);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getOwner(): Owner | null {
    const raw = localStorage.getItem(this.ownerKey);
    return raw ? JSON.parse(raw) : null;
  }
}
