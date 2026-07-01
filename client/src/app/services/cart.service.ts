import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface CartItem {
  menu_item_id: number;
  name: string;
  price: number;
  quantity: number;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private items: CartItem[] = [];
  private cartSubject = new BehaviorSubject<CartItem[]>([]);
  cart$ = this.cartSubject.asObservable();

  addItem(item: { id: number; name: string; price: number }) {
    const existing = this.items.find(i => i.menu_item_id === item.id);
    if (existing) {
      existing.quantity++;
    } else {
      this.items.push({ menu_item_id: item.id, name: item.name, price: item.price, quantity: 1 });
    }
    this.cartSubject.next([...this.items]);
  }

  removeItem(menuItemId: number) {
    this.items = this.items.filter(i => i.menu_item_id !== menuItemId);
    this.cartSubject.next([...this.items]);
  }

  updateQuantity(menuItemId: number, quantity: number) {
    const item = this.items.find(i => i.menu_item_id === menuItemId);
    if (item) {
      if (quantity <= 0) {
        this.removeItem(menuItemId);
      } else {
        item.quantity = quantity;
        this.cartSubject.next([...this.items]);
      }
    }
  }

  getTotal(): number {
    return this.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  }

  getItemCount(): number {
    return this.items.reduce((sum, i) => sum + i.quantity, 0);
  }

  getItems(): CartItem[] {
    return [...this.items];
  }

  clear() {
    this.items = [];
    this.cartSubject.next([]);
  }
}
