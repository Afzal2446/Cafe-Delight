import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-order-success',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './order-success.component.html',
  styleUrls: ['./order-success.component.css']
})
export class OrderSuccessComponent implements OnInit, OnDestroy {
  orderId: number = 0;
  order: any = null;
  payment: any = null;
  paymentError = '';
  markingPaid = false;
  showPaidForm = false;
  paidAmount: number | null = null;
  // Feedback
  feedbackRating = 0;
  feedbackMessage = '';
  feedbackSubmitted = false;
  feedbackSending = false;
  private pollInterval: any;

  statusSteps = [
    { key: 'pending', label: 'Order Placed', icon: 'fas fa-receipt' },
    { key: 'preparing', label: 'Preparing', icon: 'fas fa-fire' },
    { key: 'ready', label: 'Ready', icon: 'fas fa-check-circle' },
    { key: 'served', label: 'Served', icon: 'fas fa-utensils' }
  ];

  constructor(private route: ActivatedRoute, private api: ApiService) {}

  ngOnInit() {
    this.orderId = +this.route.snapshot.params['id'];
    this.loadOrder();
    // Poll every 5 seconds for status updates
    this.pollInterval = setInterval(() => this.loadOrder(), 5000);
  }

  ngOnDestroy() {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }

  loadOrder() {
    this.api.getOrderDetails(this.orderId).subscribe(order => {
      this.order = order;
      // Load UPI payment info once, only for UPI orders that aren't paid yet
      if (order && order.payment_mode === 'upi' && order.payment_status !== 'paid' && !this.payment) {
        this.loadPayment();
      }
      // Once the order is done, stop showing the tracking banner on the menu
      const activeId = localStorage.getItem('active_order_id');
      if (order && activeId === String(this.orderId) &&
          (order.status === 'served' || order.status === 'cancelled')) {
        localStorage.removeItem('active_order_id');
      }
    });
  }

  loadPayment() {
    this.api.getPaymentInfo(this.orderId).subscribe({
      next: (info) => this.payment = info,
      error: (err) => this.paymentError = err?.error?.error || 'Unable to load payment details'
    });
  }

  openPaidForm() {
    this.paidAmount = this.order?.total_amount ?? null;
    this.showPaidForm = true;
  }

  confirmPayment() {
    if (this.paidAmount == null || this.paidAmount < 0) return;
    this.markingPaid = true;
    this.api.confirmPayment(this.orderId, this.paidAmount).subscribe({
      next: () => {
        this.markingPaid = false;
        this.showPaidForm = false;
        this.loadOrder();
      },
      error: () => this.markingPaid = false
    });
  }

  getStatusIndex(): number {
    if (!this.order) return 0;
    const idx = this.statusSteps.findIndex(s => s.key === this.order.status);
    return idx >= 0 ? idx : 0;
  }

  isStepComplete(stepIndex: number): boolean {
    return stepIndex <= this.getStatusIndex();
  }

  isStepActive(stepIndex: number): boolean {
    return stepIndex === this.getStatusIndex();
  }

  setRating(n: number) {
    this.feedbackRating = n;
  }

  submitFeedback() {
    if (this.feedbackRating < 1) return;
    this.feedbackSending = true;
    this.api.submitFeedback({
      customer_name: this.order?.customer_name || null,
      rating: this.feedbackRating,
      message: this.feedbackMessage,
      order_id: this.orderId
    }).subscribe({
      next: () => {
        this.feedbackSending = false;
        this.feedbackSubmitted = true;
      },
      error: () => this.feedbackSending = false
    });
  }
}
