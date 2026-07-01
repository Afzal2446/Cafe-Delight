import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.css']
})
export class CartComponent {
  items: any[] = [];
  customerName = '';
  tableNumber: number | null = null;
  notes = '';
  paymentMode = 'cash';
  isPlacing = false;
  validationError = '';

  paymentModes = [
    { value: 'cash', label: 'Cash on Counter', icon: 'fas fa-money-bill-wave' },
    { value: 'upi', label: 'UPI / QR Code', icon: 'fas fa-qrcode' },
    { value: 'online', label: 'Online Payment', icon: 'fas fa-credit-card' }
  ];

  constructor(
    public cartService: CartService,
    private api: ApiService,
    private router: Router
  ) {
    this.cartService.cart$.subscribe(items => this.items = items);
    const savedTable = localStorage.getItem('table_number');
    if (savedTable) this.tableNumber = parseInt(savedTable);
  }

  updateQty(id: number, qty: number) {
    this.cartService.updateQuantity(id, qty);
  }

  remove(id: number) {
    this.cartService.removeItem(id);
  }

  placeOrder() {
    if (this.items.length === 0) return;

    // Validate mandatory fields
    if (!this.customerName || !this.customerName.trim()) {
      this.validationError = 'Please enter your name';
      return;
    }
    if (this.tableNumber == null || this.tableNumber <= 0) {
      this.validationError = 'Please enter your table number';
      return;
    }
    this.validationError = '';
    this.isPlacing = true;

    const order = {
      customer_name: this.customerName.trim(),
      table_number: this.tableNumber,
      payment_mode: this.paymentMode,
      notes: this.notes,
      items: this.items.map(i => ({
        menu_item_id: i.menu_item_id,
        quantity: i.quantity,
        price: i.price
      }))
    };

    this.api.placeOrder(order).subscribe({
      next: (res) => {
        this.cartService.clear();
        // Remember this order so the customer can track it later
        this.saveActiveOrder(res.id);
        this.router.navigate(['/order/success', res.id]);
      },
      error: () => {
        this.isPlacing = false;
        alert('Failed to place order. Please try again.');
      }
    });
  }

  private saveActiveOrder(orderId: number) {
    localStorage.setItem('active_order_id', String(orderId));
  }
}
