import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = '/api';

  constructor(private http: HttpClient) {}

  // Menu
  getCategories(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/menu/categories`);
  }

  getMenuItems(categoryId?: number): Observable<any[]> {
    const url = categoryId
      ? `${this.baseUrl}/menu/items?category_id=${categoryId}`
      : `${this.baseUrl}/menu/items`;
    return this.http.get<any[]>(url);
  }

  getAllMenuItems(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/menu/items/all`);
  }

  // Orders
  placeOrder(order: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/orders`, order);
  }

  getOrders(status?: string): Observable<any[]> {
    const url = status
      ? `${this.baseUrl}/orders?status=${status}`
      : `${this.baseUrl}/orders`;
    return this.http.get<any[]>(url);
  }

  getOrderDetails(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/orders/${id}`);
  }

  updateOrderStatus(id: number, status: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/orders/${id}/status`, { status });
  }

  updatePaymentStatus(id: number, payment_status: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/orders/${id}/payment`, { payment_status });
  }

  // Owner - Menu management
  addMenuItem(item: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/owner/menu`, item);
  }

  updateMenuItem(id: number, item: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/owner/menu/${id}`, item);
  }

  deleteMenuItem(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/owner/menu/${id}`);
  }

  addCategory(name: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/owner/categories`, { name });
  }

  deleteCategory(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/owner/categories/${id}`);
  }

  // Owner - Settings
  getSettings(): Observable<any> {
    return this.http.get(`${this.baseUrl}/owner/settings`);
  }

  updateSettings(settings: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/owner/settings`, settings);
  }

  // Owner - Stats
  getStats(): Observable<any> {
    return this.http.get(`${this.baseUrl}/owner/stats`);
  }

  // QR Code
  generateQR(table?: number): Observable<any> {
    const url = table
      ? `${this.baseUrl}/qr/generate?table=${table}`
      : `${this.baseUrl}/qr/generate`;
    return this.http.get(url);
  }
}
