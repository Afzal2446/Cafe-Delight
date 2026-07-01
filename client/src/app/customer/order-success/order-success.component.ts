import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-order-success',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './order-success.component.html',
  styleUrls: ['./order-success.component.css']
})
export class OrderSuccessComponent implements OnInit, OnDestroy {
  orderId: number = 0;
  order: any = null;
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
    this.api.getOrderDetails(this.orderId).subscribe(order => this.order = order);
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
}
