import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { OrderNotificationService, AppNotification } from '../../services/order-notification.service';

@Component({
  selector: 'app-owner-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './owner-nav.component.html',
  styleUrls: ['./owner-nav.component.css']
})
export class OwnerNavComponent implements OnInit, OnDestroy {
  pendingCount = 0;
  notifications: AppNotification[] = [];
  private subs: Subscription[] = [];

  constructor(
    private auth: AuthService,
    private router: Router,
    public notifier: OrderNotificationService
  ) {}

  ngOnInit() {
    this.notifier.start();
    this.subs.push(
      this.notifier.pendingCount$.subscribe(c => this.pendingCount = c),
      this.notifier.notifications$.subscribe(list => this.notifications = list)
    );
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  openOrder(n: AppNotification) {
    this.notifier.dismiss(n.key);
    this.router.navigate(['/owner/orders']);
  }

  dismiss(event: Event, key: string) {
    event.stopPropagation();
    this.notifier.dismiss(key);
  }

  dismissAll() {
    this.notifier.dismissAll();
  }

  logout() {
    this.notifier.reset();
    this.auth.logout();
    this.router.navigate(['/owner/login']);
  }
}
