import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { OrderNotificationService } from '../../services/order-notification.service';

@Component({
  selector: 'app-owner-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './owner-nav.component.html',
  styleUrls: ['./owner-nav.component.css']
})
export class OwnerNavComponent implements OnInit, OnDestroy {
  pendingCount = 0;
  toastMessage = '';
  showToast = false;
  private subs: Subscription[] = [];

  constructor(
    private auth: AuthService,
    private router: Router,
    public notifications: OrderNotificationService
  ) {}

  ngOnInit() {
    this.notifications.start();
    this.subs.push(
      this.notifications.pendingCount$.subscribe(c => this.pendingCount = c),
      this.notifications.newOrders$.subscribe(newOnes => this.onNewOrders(newOnes))
    );
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  private onNewOrders(newOnes: any[]) {
    this.toastMessage = newOnes.length === 1
      ? `New order #${newOnes[0].id} received!`
      : `${newOnes.length} new orders received!`;
    this.showToast = true;
    setTimeout(() => this.showToast = false, 5000);
  }

  goToOrders() {
    this.showToast = false;
    this.router.navigate(['/owner/orders']);
  }

  logout() {
    this.notifications.stop();
    this.auth.logout();
    this.router.navigate(['/owner/login']);
  }
}
