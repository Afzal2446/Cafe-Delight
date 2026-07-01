import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { OwnerNavComponent } from '../owner-nav/owner-nav.component';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, OwnerNavComponent],
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.css']
})
export class OrdersComponent implements OnInit, OnDestroy {
  orders: any[] = [];
  selectedOrder: any = null;
  orderDetails: any = null;
  filterStatus = '';
  newStatus = '';
  newPaymentStatus = '';
  private pollInterval: any;

  statuses = [
    { value: '', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'preparing', label: 'Preparing' },
    { value: 'ready', label: 'Ready' },
    { value: 'served', label: 'Served' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadOrders();
    // Auto-refresh orders every 10 seconds
    this.pollInterval = setInterval(() => this.loadOrders(), 10000);
  }

  ngOnDestroy() {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }

  loadOrders() {
    this.api.getOrders(this.filterStatus || undefined).subscribe(o => this.orders = o);
  }

  filter(status: string) {
    this.filterStatus = status;
    this.loadOrders();
  }

  selectOrder(order: any) {
    this.selectedOrder = order;
    this.newStatus = order.status;
    this.newPaymentStatus = order.payment_status;
    this.api.getOrderDetails(order.id).subscribe(d => this.orderDetails = d);
  }

  updateStatus() {
    this.api.updateOrderStatus(this.selectedOrder.id, this.newStatus).subscribe(() => {
      this.selectedOrder.status = this.newStatus;
      this.loadOrders();
    });
  }

  updatePayment() {
    this.api.updatePaymentStatus(this.selectedOrder.id, this.newPaymentStatus).subscribe(() => {
      this.selectedOrder.payment_status = this.newPaymentStatus;
      this.loadOrders();
    });
  }
}
