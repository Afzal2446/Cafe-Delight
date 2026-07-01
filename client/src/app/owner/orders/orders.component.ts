import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { OrderNotificationService } from '../../services/order-notification.service';
import { OwnerNavComponent } from '../owner-nav/owner-nav.component';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, OwnerNavComponent],
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.css']
})
export class OrdersComponent implements OnInit, OnDestroy {
  allOrders: any[] = [];
  orders: any[] = [];
  partialOrders: any[] = [];
  claimedOrders: any[] = [];
  selectedOrder: any = null;
  orderDetails: any = null;
  filterStatus = '';
  newStatus = '';
  newPaymentStatus = '';
  private sub?: Subscription;

  statuses = [
    { value: '', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'preparing', label: 'Preparing' },
    { value: 'ready', label: 'Ready' },
    { value: 'served', label: 'Served' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  constructor(
    private api: ApiService,
    private notifications: OrderNotificationService
  ) {}

  ngOnInit() {
    // The shared service polls in the background and drives notifications portal-wide.
    this.notifications.start();
    this.sub = this.notifications.orders$.subscribe(orders => {
      this.allOrders = orders;
      this.applyFilter();
    });
    this.notifications.refreshNow();
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  private applyFilter() {
    this.orders = this.filterStatus
      ? this.allOrders.filter(o => o.status === this.filterStatus)
      : this.allOrders;
    this.partialOrders = this.allOrders.filter(o => o.payment_status === 'partial');
    this.claimedOrders = this.allOrders.filter(o => o.payment_status === 'claimed');
  }

  getShortfall(order: any): number {
    return +(order.total_amount - (order.paid_amount || 0)).toFixed(2);
  }

  filter(status: string) {
    this.filterStatus = status;
    this.applyFilter();
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
      this.notifications.refreshNow();
    });
  }

  updatePayment() {
    this.api.updatePaymentStatus(this.selectedOrder.id, this.newPaymentStatus).subscribe(() => {
      this.selectedOrder.payment_status = this.newPaymentStatus;
      this.notifications.refreshNow();
    });
  }
}
